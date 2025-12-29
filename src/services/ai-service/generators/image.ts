import { generateText } from 'ai';
import { createModelConfig, selectModel, google } from '../models';
import type { ImageGenerationResult, ImageEditResult } from '../types';
import { withErrorHandling } from '../errors';
import logger from '../../../utils/logger';

export async function generateImage(prompt: string, aspectRatio: string = '1:1'): Promise<ImageGenerationResult> {
  logger.info(`Generating image: "${prompt.substring(0, 50)}..."`);

  return withErrorHandling(
    async () => {
      const promptWithInstructions = `Generate an image based on the following description. Target Aspect Ratio: ${aspectRatio}.\n\nDescription: ${prompt}`;

      // Use Gemini's image generation capability
      const response = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: promptWithInstructions,
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
    'generateImage'
  );
}

export async function editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<ImageEditResult> {
  logger.info('Editing image');

  return withErrorHandling(
    async () => {
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
                text: `Edit this image according to the following instructions: ${prompt}`,
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
    'editImage'
  );
}
