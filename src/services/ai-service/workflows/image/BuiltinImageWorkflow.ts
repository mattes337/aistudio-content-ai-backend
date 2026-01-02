/**
 * Built-in Image Workflow
 *
 * Handles image generation and editing using Gemini's multimodal capabilities.
 */

import { generateText } from 'ai';
import { google } from '../../models';
import type { ImageGenerationResult, ImageEditResult } from '../../types';
import type { ImageWorkflow, ImageGenerateInput, ImageEditInput, ImageType, ImageBounds } from '../types';
import { withErrorHandling } from '../../errors';
import logger from '../../../../utils/logger';

/**
 * Build a prompt that includes image type and bounds information
 */
function buildImagePrompt(
  basePrompt: string,
  imageType?: ImageType,
  bounds?: ImageBounds
): string {
  const parts: string[] = [];

  // Add image type context
  if (imageType && imageType !== 'other') {
    const typeDescriptions: Record<ImageType, string> = {
      photo: 'a realistic photograph',
      illustration: 'an illustration or drawing',
      icon: 'a clean, simple icon',
      diagram: 'a clear, informative diagram',
      art: 'an artistic or creative image',
      other: '',
    };
    parts.push(`Generate ${typeDescriptions[imageType]}.`);
  }

  // Add bounds/resolution context
  if (bounds) {
    if (bounds.width && bounds.height) {
      parts.push(`Target resolution: ${bounds.width}x${bounds.height} pixels.`);
    } else if (bounds.aspectRatio) {
      parts.push(`Target aspect ratio: ${bounds.aspectRatio}.`);
    }
  }

  // Add the main prompt
  parts.push(`Description: ${basePrompt}`);

  return parts.join('\n\n');
}

/**
 * Built-in image workflow using Gemini's image generation
 */
export class BuiltinImageWorkflow implements ImageWorkflow {
  readonly type = 'image' as const;
  readonly id = 'builtin';
  readonly name = 'Built-in Image';
  readonly description = 'Handles image generation and editing using Gemini multimodal';

  isAvailable(): boolean {
    return true; // Always available as the default
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerationResult> {
    const { prompt, imageType, bounds } = input;
    logger.info(`[BuiltinImage] Generating image: type=${imageType || 'default'}, bounds=${JSON.stringify(bounds)}, prompt="${prompt.substring(0, 50)}..."`);

    return withErrorHandling(
      async () => {
        const fullPrompt = buildImagePrompt(prompt, imageType, bounds);

        // Use Gemini's image generation capability
        const response = await generateText({
          model: google('gemini-2.5-flash'),
          prompt: fullPrompt,
          providerOptions: {
            google: {
              responseModalities: ['IMAGE', 'TEXT'],
            },
          },
        });

        // Extract image from response files
        const imageFile = response.files?.[0];

        if (imageFile && imageFile.base64) {
          const mimeType = (imageFile as any).mimeType || 'image/png';
          return {
            imageUrl: `data:${mimeType};base64,${imageFile.base64}`,
            base64Image: imageFile.base64,
            mimeType,
          };
        }

        // Fallback: check experimental output
        if (response.experimental_output) {
          const output = response.experimental_output as any;
          if (output.image) {
            const mimeType = output.mimeType || 'image/png';
            const base64 =
              typeof output.image === 'string' ? output.image : Buffer.from(output.image).toString('base64');
            return {
              imageUrl: `data:${mimeType};base64,${base64}`,
              base64Image: base64,
              mimeType,
            };
          }
        }

        throw new Error('No image generated from model');
      },
      'BuiltinImageWorkflow.generate'
    );
  }

  async edit(input: ImageEditInput): Promise<ImageEditResult> {
    const { base64ImageData, mimeType, prompt, imageType, bounds } = input;
    logger.info(`[BuiltinImage] Editing image: type=${imageType || 'default'}, bounds=${JSON.stringify(bounds)}`);

    return withErrorHandling(
      async () => {
        // Build edit prompt with type and bounds context
        let editPrompt = `Edit this image according to the following instructions: ${prompt}`;
        if (imageType && imageType !== 'other') {
          editPrompt += `\n\nThe result should be ${imageType === 'photo' ? 'a realistic photograph' : `a ${imageType}`}.`;
        }
        if (bounds?.aspectRatio) {
          editPrompt += `\n\nMaintain or adjust to aspect ratio: ${bounds.aspectRatio}.`;
        }

        // Use Gemini's image editing capability with multimodal input
        const response = await generateText({
          model: google('gemini-2.5-flash'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  image: Buffer.from(base64ImageData, 'base64'),
                },
                {
                  type: 'text',
                  text: editPrompt,
                },
              ],
            },
          ],
          providerOptions: {
            google: {
              responseModalities: ['IMAGE', 'TEXT'],
            },
          },
        });

        // Extract edited image from response
        const imageFile = response.files?.[0];

        if (imageFile && imageFile.base64) {
          const resultMime = (imageFile as any).mimeType || 'image/png';
          return {
            imageUrl: `data:${resultMime};base64,${imageFile.base64}`,
            base64Image: imageFile.base64,
          };
        }

        // Fallback: check experimental output
        if (response.experimental_output) {
          const output = response.experimental_output as any;
          if (output.image) {
            const resultMime = output.mimeType || 'image/png';
            const base64 =
              typeof output.image === 'string' ? output.image : Buffer.from(output.image).toString('base64');
            return {
              imageUrl: `data:${resultMime};base64,${base64}`,
              base64Image: base64,
            };
          }
        }

        throw new Error('No edited image returned from model');
      },
      'BuiltinImageWorkflow.edit'
    );
  }
}
