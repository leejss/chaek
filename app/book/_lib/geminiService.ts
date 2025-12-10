import { GoogleGenAI, Type } from '@google/genai';
import { GeminiModel } from './types';

const apiKey = process.env.API_KEY;

if (!apiKey) {
  // Fail fast to avoid leaking requests without credentials.
  console.warn('Gemini API_KEY is not set. Book generation will be disabled.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const ensureClient = () => {
  if (!ai) {
    throw new Error('API key missing. Please set API_KEY in environment variables.');
  }
  return ai;
};

export const generateTableOfContents = async (sourceText: string): Promise<string[]> => {
  try {
    const client = ensureClient();
    const response = await client.models.generateContent({
      model: GeminiModel.FLASH,
      contents: `You are an expert book editor. Create a compelling Table of Contents (list of chapter titles) based on the following source text.
      
      SOURCE TEXT:
      ${sourceText.substring(0, 20000)}... (truncated if too long)
      
      Return ONLY a JSON array of strings, where each string is a chapter title. Do not include "Chapter 1" prefixes unless necessary for context.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error('No content generated');

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== 'string')) {
      throw new Error('Invalid TOC format');
    }
    return parsed as string[];
  } catch (error) {
    console.error('Error generating TOC:', error);
    throw error;
  }
};

export async function* streamBookGeneration(
  toc: string[],
  sourceText: string,
  model: GeminiModel,
): AsyncGenerator<string, void, unknown> {
  try {
    const client = ensureClient();
    const prompt = `
    You are a professional author. Write a book based on the provided Table of Contents and Source Text.
    
    TABLE OF CONTENTS:
    ${toc.map((t, i) => `${i + 1}. ${t}`).join('\n')}
    
    SOURCE MATERIAL:
    ${sourceText.substring(0, 30000)}
    
    INSTRUCTIONS:
    - Write in Markdown format.
    - Use headers (# for Title, ## for Chapter Titles).
    - Write the content for EVERY chapter listed in the TOC.
    - Ensure a cohesive narrative flow.
    - Do not stop until the book is complete.
    - Use an elegant, sophisticated tone.
    `;

    const streamResponse = await client.models.generateContentStream({
      model,
      contents: prompt,
    });

    for await (const chunk of streamResponse) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error('Error streaming book:', error);
    throw error;
  }
}

