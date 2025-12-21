import {
  bookChapterSystemInstruction,
  bookChapterUserContents,
  tocSystemInstruction,
  tocUserContents,
} from "@/lib/ai/instructions";
import { ClaudeModel } from "@/lib/book/types";
import { appendDebugFile } from "@/lib/dev";
import { env } from "@/lib/env";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const TOC_TOOL_NAME = "return_toc";

type ToolUseBlock = {
  type: "tool_use";
  name: string;
  input?: unknown;
};

const isToolUseBlock = (block: unknown): block is ToolUseBlock => {
  if (!block || typeof block !== "object") return false;
  const b = block as { type?: unknown; name?: unknown; input?: unknown };
  return b.type === "tool_use" && typeof b.name === "string";
};

const findToolUseInput = (content: unknown, toolName: string): unknown => {
  if (!Array.isArray(content)) {
    throw new Error("Unexpected response content from Claude");
  }
  const toolUse = content.find(
    (block) => isToolUseBlock(block) && block.name === toolName,
  );
  if (!isToolUseBlock(toolUse) || toolUse.input == null) {
    throw new Error("Claude did not return TOC tool output");
  }
  return toolUse.input;
};

export const generateTableOfContents = async (
  sourceText: string,
  model: ClaudeModel,
): Promise<string[]> => {
  const systemInstruction = tocSystemInstruction();
  const userContent = tocUserContents(sourceText);

  const tocToolInputSchema = z.object({
    toc: z.array(z.string()),
  });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: systemInstruction,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    tools: [
      {
        name: TOC_TOOL_NAME,
        description:
          "Return the table of contents as a JSON object with a 'toc' string array.",
        input_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            toc: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["toc"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOC_TOOL_NAME },
  });

  const toolInput = findToolUseInput(response.content, TOC_TOOL_NAME);
  const parsed = tocToolInputSchema.safeParse(toolInput);
  if (!parsed.success) {
    console.error("Invalid TOC tool input:", parsed.error);
    throw new Error("Invalid TOC format");
  }
  return parsed.data.toc;
};

export async function* streamBookChapterGeneration(params: {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  model: ClaudeModel;
}): AsyncGenerator<string, void, unknown> {
  const { toc, chapterTitle, chapterNumber, sourceText, model } = params;

  const systemInstruction = bookChapterSystemInstruction(toc);
  const userContent = bookChapterUserContents({
    chapterTitle,
    chapterNumber,
    sourceText,
  });

  console.log("System instruction:", systemInstruction);
  console.log("User content:", userContent);

  const stream = await anthropic.messages.create({
    model: model,
    max_tokens: 4096,
    system: systemInstruction,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      const text = chunk.delta.text;
      // await appendDebugFile(debugPath, text).catch(console.error);
      yield text;
    }
  }
}
