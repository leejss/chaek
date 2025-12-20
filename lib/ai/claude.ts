import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { ClaudeModel } from "@/lib/book/types";
import {
  bookChapterSystemInstruction,
  bookChapterUserContents,
  tocSystemInstruction,
  tocUserContents,
} from "@/lib/ai/instructions";

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export const generateTableOfContents = async (
  sourceText: string,
): Promise<string[]> => {
  const response = await anthropic.messages.create({
    model: ClaudeModel.SONNET,
    max_tokens: 1024,
    system: tocSystemInstruction(),
    messages: [
      {
        role: "user",
        content: tocUserContents(sourceText),
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected content type from Claude");
  }

  const jsonStr = content.text;
  if (!jsonStr) throw new Error("No content generated");

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) {
      throw new Error("Invalid TOC format");
    }
    return parsed as string[];
  } catch (e) {
    console.error("Failed to parse TOC JSON:", jsonStr);
    throw new Error("Failed to parse TOC JSON");
  }
};

export async function* streamBookChapterGeneration(params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  model: ClaudeModel;
}): AsyncGenerator<string, void, unknown> {
  const { toc, chapterTitle, chapterNumber, sourceText, model } = params;

  const stream = await anthropic.messages.create({
    model: model,
    max_tokens: 4096,
    system: bookChapterSystemInstruction(toc),
    messages: [
      {
        role: "user",
        content: bookChapterUserContents({
          chapterTitle,
          chapterNumber,
          sourceText,
        }),
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}
