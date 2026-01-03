/**
 * ImageRouter Workflow
 *
 * Handles image generation and editing using the ImageRouter.io API.
 * Provides access to multiple image generation models through a unified OpenAI-compatible interface.
 */

import type { ImageGenerationResult, ImageEditResult } from '../../types';
import type { ImageWorkflow, ImageGenerateInput, ImageEditInput, ImageType, ImageBounds } from '../types';
import { DEFAULT_IMAGE_SYSTEM_PROMPT } from '../types';
import { withErrorHandling } from '../../errors';
import logger from '../../../../utils/logger';
import { loadEnvConfig } from '../../../../utils/env';

const config = loadEnvConfig();

/**
 * Build a prompt that includes image type context
 */
function buildImagePrompt(basePrompt: string, imageType?: ImageType): string {
  if (!imageType || imageType === 'other') {
    return basePrompt;
  }

  const typeDescriptions: Record<ImageType, string> = {
    photo: 'a realistic photograph',
    illustration: 'an illustration or drawing',
    icon: 'a clean, simple icon',
    diagram: 'a clear, informative diagram',
    art: 'an artistic or creative image',
    other: '',
  };

  return `Generate ${typeDescriptions[imageType]}. Description: ${basePrompt}`;
}

/** Maximum prompt length for ImageRouter API */
const MAX_PROMPT_LENGTH = 512;

/**
 * Convert ImageBounds to ImageRouter size string
 */
function boundsToSize(bounds?: ImageBounds): string | undefined {
  if (!bounds) return undefined;

  // If width and height are specified, use them directly
  if (bounds.width && bounds.height) {
    return `${bounds.width}x${bounds.height}`;
  }

  // Map common aspect ratios to standard sizes
  if (bounds.aspectRatio) {
    const aspectRatioMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:3': '1408x1024',
      '3:4': '1024x1408',
      '3:2': '1536x1024',
      '2:3': '1024x1536',
    };
    return aspectRatioMap[bounds.aspectRatio];
  }

  return undefined;
}

interface ImageRouterGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/** Model information from ImageRouter API */
export interface ImageRouterModel {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
  supportsEdit: boolean;
  supportsQuality: boolean;
  /** If true, this model only supports editing (requires input image), not text-to-image generation */
  isEditOnly: boolean;
  sizes?: string[];
  pricePerImage?: number;
}

interface ImageRouterModelsResponse {
  [modelId: string]: {
    providers: Array<{
      id: string;
      model_name: string;
      pricing: {
        type: string;
        value?: number;
        range?: { min: number; average: number; max: number };
      };
    }>;
    release_date?: string;
    sizes?: string[];
    output: string[];
    supported_params: {
      quality: boolean;
      edit: boolean;
      mask: boolean;
    };
  };
}

/** Cached model sizes - maps model ID to supported sizes */
let modelSizesCache: Map<string, string[]> | null = null;
let modelSizesCacheTime = 0;
const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * ImageRouter workflow for image generation via ImageRouter.io API
 */
export class ImageRouterWorkflow implements ImageWorkflow {
  readonly type = 'image' as const;
  readonly id = 'imagerouter';
  readonly name = 'ImageRouter';
  readonly description = 'Image generation and editing via ImageRouter.io API';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly freeOnly: boolean;

  constructor() {
    this.apiKey = config.imageRouter.apiKey;
    this.baseUrl = config.imageRouter.baseUrl;
    this.defaultModel = config.imageRouter.model;
    this.freeOnly = config.imageRouter.freeOnly;
  }

  /**
   * Get supported sizes for a specific model
   */
  private async getModelSizes(modelId: string): Promise<string[] | undefined> {
    // Check cache
    if (modelSizesCache && Date.now() - modelSizesCacheTime < MODEL_CACHE_TTL) {
      return modelSizesCache.get(modelId);
    }

    // Fetch fresh model data
    try {
      const response = await fetch('https://api.imagerouter.io/v1/models?type=image', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) return undefined;

      const data = (await response.json()) as ImageRouterModelsResponse;
      modelSizesCache = new Map();
      modelSizesCacheTime = Date.now();

      for (const [id, info] of Object.entries(data)) {
        if (info.sizes) {
          modelSizesCache.set(id, info.sizes);
        }
      }

      return modelSizesCache.get(modelId);
    } catch {
      return undefined;
    }
  }

  /**
   * Find best matching size from model's supported sizes
   */
  private findBestSize(requestedSize: string, supportedSizes: string[]): string {
    // If requested size is supported, use it
    if (supportedSizes.includes(requestedSize)) {
      return requestedSize;
    }

    // Parse requested dimensions
    const [reqW, reqH] = requestedSize.split('x').map(Number);
    const reqRatio = reqW / reqH;

    // Find closest matching size by aspect ratio
    let bestSize = supportedSizes[0];
    let bestRatioDiff = Infinity;

    for (const size of supportedSizes) {
      if (size === 'auto') continue;
      const [w, h] = size.split('x').map(Number);
      if (isNaN(w) || isNaN(h)) continue;

      const ratio = w / h;
      const ratioDiff = Math.abs(ratio - reqRatio);

      if (ratioDiff < bestRatioDiff) {
        bestRatioDiff = ratioDiff;
        bestSize = size;
      }
    }

    return bestSize;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Get available image generation models from ImageRouter
   */
  async getModels(): Promise<ImageRouterModel[]> {
    logger.info(`[ImageRouter] Fetching models (freeOnly=${this.freeOnly})`);

    const response = await fetch('https://api.imagerouter.io/v1/models?type=image', {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[ImageRouter] Failed to fetch models: ${response.status} ${errorText}`);
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = (await response.json()) as ImageRouterModelsResponse;
    const models: ImageRouterModel[] = [];

    // Models that are image processing/editing only, not text-to-image generation
    const editOnlyPatterns = [
      'blur-background',
      'remove-background',
      'erase-foreground',
      'enhance',
      'upscale',
      'colorize',
      'deblur',
    ];

    for (const [modelId, modelInfo] of Object.entries(data)) {
      // Skip non-image models
      if (!modelInfo.output?.includes('image')) continue;

      const isFree = modelId.endsWith(':free');

      // Filter by freeOnly config
      if (this.freeOnly && !isFree) continue;

      // Check if this is an edit-only model (requires input image, not text-to-image)
      const modelName = modelId.split('/').pop()?.replace(/:.*$/, '').toLowerCase() || '';
      const isEditOnly = editOnlyPatterns.some((pattern) => modelName.includes(pattern));

      // Get pricing from first provider
      const firstProvider = modelInfo.providers?.[0];
      let pricePerImage: number | undefined;
      if (firstProvider?.pricing) {
        if (firstProvider.pricing.value !== undefined) {
          pricePerImage = firstProvider.pricing.value;
        } else if (firstProvider.pricing.range) {
          pricePerImage = firstProvider.pricing.range.average;
        }
      }

      // Create friendly name from model ID
      const name = modelId
        .replace(/:[^:]+$/, '') // Remove :free suffix for display
        .split('/')
        .pop() || modelId;

      models.push({
        id: modelId,
        name,
        provider: modelId.split('/')[0] || 'unknown',
        isFree,
        supportsEdit: modelInfo.supported_params?.edit ?? false,
        supportsQuality: modelInfo.supported_params?.quality ?? false,
        isEditOnly,
        sizes: modelInfo.sizes,
        pricePerImage,
      });
    }

    // Sort: generation models first, then free models, then by name
    models.sort((a, b) => {
      // Generation models before edit-only models
      if (a.isEditOnly !== b.isEditOnly) return a.isEditOnly ? 1 : -1;
      // Free models first within each category
      if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    logger.info(`[ImageRouter] Found ${models.length} models`);
    return models;
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerationResult> {
    const { prompt, imageType, bounds, model, quality, systemPrompt } = input;
    const effectiveModel = model || this.defaultModel;
    const effectiveSystemPrompt = systemPrompt ?? DEFAULT_IMAGE_SYSTEM_PROMPT;

    logger.info(
      `[ImageRouter] Generating image: model=${effectiveModel}, type=${imageType || 'default'}, ` +
        `quality=${quality || 'auto'}, bounds=${JSON.stringify(bounds)}, prompt="${prompt.substring(0, 50)}..."`
    );

    return withErrorHandling(async () => {
      // Build the full prompt with system instructions
      let enhancedPrompt = buildImagePrompt(prompt, imageType);
      if (effectiveSystemPrompt) {
        enhancedPrompt = `${effectiveSystemPrompt}. ${enhancedPrompt}`;
      }

      // Truncate prompt to max length (some models have 512 char limit)
      if (enhancedPrompt.length > MAX_PROMPT_LENGTH) {
        logger.warn(`[ImageRouter] Truncating prompt from ${enhancedPrompt.length} to ${MAX_PROMPT_LENGTH} chars`);
        enhancedPrompt = enhancedPrompt.substring(0, MAX_PROMPT_LENGTH);
      }

      // Get requested size and validate against model's supported sizes
      let size = boundsToSize(bounds);

      // Free models are ALWAYS limited to 1024x1024 regardless of what the API says
      const isFreeModel = effectiveModel.endsWith(':free');
      if (isFreeModel && size && size !== '1024x1024') {
        logger.info(`[ImageRouter] Free model ${effectiveModel} - forcing size to 1024x1024 (was ${size})`);
        size = '1024x1024';
      } else if (size) {
        const supportedSizes = await this.getModelSizes(effectiveModel);
        if (supportedSizes && supportedSizes.length > 0) {
          const originalSize = size;
          size = this.findBestSize(size, supportedSizes);
          if (size !== originalSize) {
            logger.info(`[ImageRouter] Mapped size ${originalSize} to ${size} for model ${effectiveModel}`);
          }
        }
      }

      const requestBody: Record<string, unknown> = {
        model: effectiveModel,
        prompt: enhancedPrompt,
        response_format: 'b64_json',
        quality: quality || 'auto',
      };

      if (size) {
        requestBody.size = size;
      }

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[ImageRouter] Generation failed: ${response.status} ${errorText}`);
        throw new Error(`ImageRouter API error: ${response.status} ${errorText}`);
      }

      const result = (await response.json()) as ImageRouterGenerationResponse;

      logger.debug(`[ImageRouter] Response: ${JSON.stringify(result).substring(0, 500)}`);

      if (!result.data?.[0]?.b64_json) {
        logger.error(`[ImageRouter] No b64_json in response: ${JSON.stringify(result)}`);
        throw new Error('No image data in ImageRouter response');
      }

      const base64Image = result.data[0].b64_json;
      const mimeType = 'image/png'; // ImageRouter typically returns PNG

      return {
        imageUrl: `data:${mimeType};base64,${base64Image}`,
        base64Image,
        mimeType,
      };
    }, 'ImageRouterWorkflow.generate');
  }

  async edit(input: ImageEditInput): Promise<ImageEditResult> {
    const { base64ImageData, mimeType: inputMimeType, prompt, imageType, bounds, model, quality } = input;
    const effectiveModel = model || this.defaultModel;

    logger.info(
      `[ImageRouter] Editing image: model=${effectiveModel}, type=${imageType || 'default'}, ` +
        `quality=${quality || 'auto'}, bounds=${JSON.stringify(bounds)}`
    );

    return withErrorHandling(async () => {
      // Build edit prompt with type context
      let editPrompt = prompt;
      if (imageType && imageType !== 'other') {
        editPrompt += `. The result should be ${imageType === 'photo' ? 'a realistic photograph' : `a ${imageType}`}.`;
      }

      // Get requested size and validate against model's supported sizes
      let size = boundsToSize(bounds);

      // Free models are ALWAYS limited to 1024x1024 regardless of what the API says
      const isFreeModel = effectiveModel.endsWith(':free');
      if (isFreeModel && size && size !== '1024x1024') {
        logger.info(`[ImageRouter] Free model ${effectiveModel} - forcing size to 1024x1024 (was ${size})`);
        size = '1024x1024';
      } else if (size) {
        const supportedSizes = await this.getModelSizes(effectiveModel);
        if (supportedSizes && supportedSizes.length > 0) {
          const originalSize = size;
          size = this.findBestSize(size, supportedSizes);
          if (size !== originalSize) {
            logger.info(`[ImageRouter] Mapped size ${originalSize} to ${size} for model ${effectiveModel}`);
          }
        }
      }

      // For edit, we need to use FormData to send the image
      const formData = new FormData();
      formData.append('model', effectiveModel);
      formData.append('prompt', editPrompt);
      formData.append('response_format', 'b64_json');

      if (quality) {
        formData.append('quality', quality);
      }
      if (size) {
        formData.append('size', size);
      }

      // Convert base64 to Blob for the image
      const imageBuffer = Buffer.from(base64ImageData, 'base64');
      const imageBlob = new Blob([imageBuffer], { type: inputMimeType });
      formData.append('image', imageBlob, 'image.png');

      const response = await fetch(`${this.baseUrl}/images/edits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[ImageRouter] Edit failed: ${response.status} ${errorText}`);
        throw new Error(`ImageRouter API error: ${response.status} ${errorText}`);
      }

      const result = (await response.json()) as ImageRouterGenerationResponse;

      if (!result.data?.[0]?.b64_json) {
        throw new Error('No image data in ImageRouter edit response');
      }

      const base64Image = result.data[0].b64_json;

      return {
        imageUrl: `data:image/png;base64,${base64Image}`,
        base64Image,
      };
    }, 'ImageRouterWorkflow.edit');
  }
}
