import { GoogleGenAI, Type } from "@google/genai";
import { serverEnv } from "@/lib/env";
import { ChapterOutline, GeminiModel, Section } from "@/lib/book/types";
import {
  bookChapterSystemInstruction,
  bookChapterUserContents,
  chapterOutlineSystemInstruction,
  chapterOutlineUserContents,
  chapterRefinementSystemInstruction,
  chapterRefinementUserContents,
  sectionContentSystemInstruction,
  sectionContentUserContents,
  tocResponseConfig,
  tocSystemInstruction,
  tocUserContents,
} from "@/lib/ai/instructions";
import { z } from "zod";

export const gemini = new GoogleGenAI({
  apiKey: serverEnv.GEMINI_API_KEY,
});

export const generateTableOfContents = async (
  sourceText: string,
): Promise<string[]> => {
  const response = await gemini.models.generateContent({
    model: GeminiModel.FLASH,
    config: {
      systemInstruction: tocSystemInstruction(),
      ...tocResponseConfig,
    },
    contents: tocUserContents(sourceText),
  });

  const jsonStr = response.text;
  if (!jsonStr) throw new Error("No content generated");

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) {
    throw new Error("Invalid TOC format");
  }
  return parsed as string[];
};

// export async function* streamBookGeneration(
//   toc: string[],
//   sourceText: string,
//   model: GeminiModel,
// ): AsyncGenerator<string, void, unknown> {
//   const streamResponse = await gemini.models.generateContentStream({
//     model,
//     config: {
//       systemInstruction: bookSystemInstruction(),
//     },
//     contents: bookUserContents(toc, sourceText),
//   });

//   for await (const chunk of streamResponse) {
//     if (chunk.text) {
//       yield chunk.text;
//     }
//   }
// }

export async function* streamBookChapterGeneration(params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  model: GeminiModel;
}): AsyncGenerator<string, void, unknown> {
  const { toc, chapterTitle, chapterNumber, model } = params;

  const streamResponse = await gemini.models.generateContentStream({
    model,
    config: {
      systemInstruction: bookChapterSystemInstruction(toc),
    },
    contents: bookChapterUserContents({
      chapterTitle,
      chapterNumber,
    }),
  });

  for await (const chunk of streamResponse) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

const chapterOutlineResponseConfig = {
  responseMimeType: "application/json" as const,
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      chapterNumber: { type: Type.NUMBER },
      chapterTitle: { type: Type.STRING },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ["title", "summary"],
        },
      },
    },
    required: ["chapterNumber", "chapterTitle", "sections"],
  },
};

const chapterOutlineSchema = z.object({
  chapterNumber: z.number(),
  chapterTitle: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
    }),
  ),
});

export const generateChapterOutline = async (params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  model: GeminiModel;
}): Promise<ChapterOutline> => {
  const { toc, chapterTitle, chapterNumber, sourceText, model } = params;

  const systemInstruction = chapterOutlineSystemInstruction(toc, sourceText);
  const userContent = chapterOutlineUserContents({
    chapterTitle,
    chapterNumber,
  });

  const response = await gemini.models.generateContent({
    model,
    config: {
      systemInstruction,
      ...chapterOutlineResponseConfig,
    },
    contents: userContent,
  });

  const jsonStr = response.text;
  if (!jsonStr) throw new Error("No outline generated");

  const parsed = chapterOutlineSchema.safeParse(JSON.parse(jsonStr));
  if (!parsed.success) {
    console.error("Invalid outline format:", parsed.error);
    throw new Error("Invalid chapter outline format");
  }
  return parsed.data;
};

export async function* streamSectionContent(params: {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  model: GeminiModel;
}): AsyncGenerator<string, void, unknown> {
  const {
    chapterNumber,
    chapterTitle,
    chapterOutline,
    sectionIndex,
    previousSections,
    model,
  } = params;

  const currentSection = chapterOutline[sectionIndex];
  if (!currentSection) {
    throw new Error(`Section at index ${sectionIndex} not found`);
  }

  const systemInstruction = sectionContentSystemInstruction({
    chapterNumber,
    chapterTitle,
    chapterOutline,
    previousSections,
  });

  const userContent = sectionContentUserContents({
    sectionTitle: currentSection.title,
    sectionSummary: currentSection.summary,
  });

  const streamResponse = await gemini.models.generateContentStream({
    model,
    config: { systemInstruction },
    contents: userContent,
  });

  for await (const chunk of streamResponse) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export async function* streamChapterRefinement(params: {
  toc: string[];
  chapterNumber: number;
  chapterTitle: string;
  assembledContent: string;
  model: GeminiModel;
}): AsyncGenerator<string, void, unknown> {
  const { toc, chapterNumber, chapterTitle, assembledContent, model } = params;

  const systemInstruction = chapterRefinementSystemInstruction(toc);
  const userContent = chapterRefinementUserContents({
    chapterNumber,
    chapterTitle,
    assembledContent,
  });

  const streamResponse = await gemini.models.generateContentStream({
    model,
    config: { systemInstruction },
    contents: userContent,
  });

  for await (const chunk of streamResponse) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
