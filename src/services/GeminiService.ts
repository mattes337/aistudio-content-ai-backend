import { GoogleGenAI, Type, Modality } from "@google/genai";
import { loadEnvConfig } from '../utils/env';
import logger from '../utils/logger';

const config = loadEnvConfig();

// Initialize the Google GenAI client
const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

// Helper to clean JSON string (remove markdown code blocks)
const cleanJson = (text: string | undefined): string => {
  if (!text) return '{}';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '');
  return cleaned.trim();
};

export interface RefineContentResult {
  content: string;
  chatResponse: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export class GeminiService {
  private static readonly TEXT_MODEL = 'gemini-2.5-flash-preview-05-20';
  private static readonly IMAGE_MODEL = 'gemini-2.0-flash-exp';

  /**
   * Refine content with AI assistance
   */
  static async refineContent(
    currentContent: string,
    instruction: string,
    type: 'article' | 'post' | 'newsletter',
    history: ChatMessage[] = []
  ): Promise<RefineContentResult> {
    logger.info(`Refining ${type} content via Gemini`);

    const historyContext = history
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`)
      .join('\n');

    const prompt = `
Current Content:
"""
${currentContent || '(No content yet)'}
"""

Previous Conversation History:
"""
${historyContext || '(No history)'}
"""

User Instruction: "${instruction}"

Task:
1. Generate or Update the content based on the instruction and context.
2. Provide a very brief, encouraging response to the user about what you changed (max 1 sentence).
`;

    try {
      const response = await ai.models.generateContent({
        model: this.TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: `You are an expert content creator helping a user write a ${type}. Always return valid JSON.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "The full updated content text/html." },
              chatResponse: { type: Type.STRING, description: "A brief reply to the user." }
            },
            required: ["content", "chatResponse"]
          }
        }
      });

      const result = JSON.parse(cleanJson(response.text));
      return {
        content: result.content || currentContent,
        chatResponse: result.chatResponse || "Here is the updated draft."
      };
    } catch (error) {
      logger.error('Error refining content with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate a title from content
   */
  static async generateTitle(content: string): Promise<{ title: string }> {
    logger.info('Generating title via Gemini');

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: `Generate a catchy, SEO-friendly title for the following article content:\n\n${content.substring(0, 2000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { title: { type: Type.STRING } },
          required: ["title"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text));
  }

  /**
   * Generate a subject line from newsletter content
   */
  static async generateSubject(content: string): Promise<{ subject: string }> {
    logger.info('Generating subject via Gemini');

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: `Generate a compelling email subject line for this newsletter content:\n\n${content.substring(0, 2000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { subject: { type: Type.STRING } },
          required: ["subject"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text));
  }

  /**
   * Generate SEO metadata and excerpt from content
   */
  static async generateMetadata(
    content: string,
    title: string
  ): Promise<{
    seo: { title: string; description: string; keywords: string; slug: string };
    excerpt: string;
  }> {
    logger.info('Generating metadata via Gemini');

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: `Generate SEO metadata and a short excerpt for this article.\nTitle: ${title}\nContent: ${content.substring(0, 3000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "SEO Title (max 60 chars)" },
                description: { type: Type.STRING, description: "Meta Description (max 160 chars)" },
                keywords: { type: Type.STRING, description: "Comma-separated keywords" },
                slug: { type: Type.STRING, description: "URL slug" }
              },
              required: ["title", "description", "keywords", "slug"]
            },
            excerpt: { type: Type.STRING, description: "A short summary (approx 150 chars)" }
          },
          required: ["seo", "excerpt"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text));
  }

  /**
   * Generate an excerpt from content
   */
  static async generateExcerpt(content: string): Promise<{ excerpt: string }> {
    logger.info('Generating excerpt via Gemini');

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: `Summarize this text into a short excerpt:\n\n${content.substring(0, 2000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { excerpt: { type: Type.STRING } },
          required: ["excerpt"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text));
  }

  /**
   * Generate preview text for newsletter
   */
  static async generatePreviewText(content: string): Promise<{ previewText: string }> {
    logger.info('Generating preview text via Gemini');

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: `Generate a short preview text (preheader) for this email:\n\n${content.substring(0, 2000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { previewText: { type: Type.STRING } },
          required: ["previewText"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text));
  }

  /**
   * Generate post details (content, altText, tags) from prompt
   */
  static async generatePostDetails(
    prompt: string,
    currentCaption: string
  ): Promise<{ content: string; altText: string; tags: string[] }> {
    logger.info('Generating post details via Gemini');

    const input = `
Task: Create or refine an Instagram post based on the user's prompt.
User Prompt: "${prompt}"
Current Caption Context: "${currentCaption}"

Output Requirements:
1. content: The caption text (include emojis).
2. altText: Accessibility description for the image.
3. tags: Array of hashtags (without # symbol).
`;

    const response = await ai.models.generateContent({
      model: this.TEXT_MODEL,
      contents: input,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            altText: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["content", "altText", "tags"]
        }
      }
    });

    const result = JSON.parse(cleanJson(response.text));
    const formattedTags = (result.tags || []).map((t: string) =>
      String(t).startsWith('#') ? String(t) : `#${t}`
    );

    return {
      content: result.content || '',
      altText: result.altText || '',
      tags: formattedTags
    };
  }

  /**
   * Generate an image from a prompt
   */
  static async generateImage(
    prompt: string,
    aspectRatio: string = '1:1'
  ): Promise<{ imageUrl: string; base64Image: string; mimeType: string }> {
    logger.info(`Generating image via Gemini: "${prompt.substring(0, 50)}..."`);

    const promptWithInstructions = `${prompt}. (Target Aspect Ratio: ${aspectRatio})`;

    try {
      const response = await ai.models.generateContent({
        model: this.IMAGE_MODEL,
        contents: {
          parts: [{ text: promptWithInstructions }],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64ImageBytes = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return {
            imageUrl: `data:${mimeType};base64,${base64ImageBytes}`,
            base64Image: base64ImageBytes as string,
            mimeType
          };
        }
      }
      throw new Error("No image generated from model.");
    } catch (error) {
      logger.error('Image generation failed:', error);
      throw error;
    }
  }

  /**
   * Edit an existing image with a prompt
   */
  static async editImage(
    base64ImageData: string,
    mimeType: string,
    prompt: string
  ): Promise<{ imageUrl: string; base64Image: string }> {
    logger.info('Editing image via Gemini');

    try {
      const response = await ai.models.generateContent({
        model: this.IMAGE_MODEL,
        contents: {
          parts: [
            { inlineData: { data: base64ImageData, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64ImageBytes = part.inlineData.data;
          const resultMime = part.inlineData.mimeType || 'image/png';
          return {
            imageUrl: `data:${resultMime};base64,${base64ImageBytes}`,
            base64Image: base64ImageBytes as string
          };
        }
      }
      throw new Error("No image edited");
    } catch (error) {
      logger.error('Image edit failed:', error);
      throw error;
    }
  }

  /**
   * Infer metadata based on content type
   */
  static async inferMetadata(
    content: string,
    type: 'article' | 'post' | 'newsletter'
  ): Promise<any> {
    if (type === 'article') {
      const titleReq = await this.generateTitle(content);
      const metaReq = await this.generateMetadata(content, titleReq.title);
      return { ...titleReq, ...metaReq };
    } else if (type === 'newsletter') {
      const subjectReq = await this.generateSubject(content);
      const previewReq = await this.generatePreviewText(content);
      return { ...subjectReq, ...previewReq };
    } else {
      // Post
      const details = await this.generatePostDetails("Generate details for this caption", content);
      return details;
    }
  }
}
