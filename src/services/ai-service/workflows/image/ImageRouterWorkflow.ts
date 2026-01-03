/**
 * ImageRouter Workflow
 *
 * Handles image generation and editing using the ImageRouter.io API.
 * Provides access to multiple image generation models through a unified OpenAI-compatible interface.
 */

import type { ImageGenerationResult, ImageEditResult } from '../../types';
import type { ImageWorkflow, ImageGenerateInput, ImageEditInput, ImageType, ImageBounds } from '../types';
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

    for (const [modelId, modelInfo] of Object.entries(data)) {
      // Skip non-image models
      if (!modelInfo.output?.includes('image')) continue;

      const isFree = modelId.endsWith(':free');

      // Filter by freeOnly config
      if (this.freeOnly && !isFree) continue;

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
        sizes: modelInfo.sizes,
        pricePerImage,
      });
    }

    // Sort: free models first, then by name
    models.sort((a, b) => {
      if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    logger.info(`[ImageRouter] Found ${models.length} models`);
    return models;
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerationResult> {
    const { prompt, imageType, bounds, model, quality } = input;
    const effectiveModel = model || this.defaultModel;

    logger.info(
      `[ImageRouter] Generating image: model=${effectiveModel}, type=${imageType || 'default'}, ` +
        `quality=${quality || 'auto'}, bounds=${JSON.stringify(bounds)}, prompt="${prompt.substring(0, 50)}..."`
    );

    return withErrorHandling(async () => {
      const enhancedPrompt = buildImagePrompt(prompt, imageType);
      const size = boundsToSize(bounds);

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

      if (!result.data?.[0]?.b64_json) {
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

      const size = boundsToSize(bounds);

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
