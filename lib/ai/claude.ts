import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { ClaudeModel } from "@/lib/book/types";
import { appendDebugFile } from "@/lib/dev";
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
  model: ClaudeModel,
): Promise<string[]> => {
  const systemInstruction = tocSystemInstruction();
  const userContent = tocUserContents(sourceText);

  console.log({
    systemInstruction,
    userContent,
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
  });

  console.log(response.content);

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected content type from Claude");
  }

  let jsonStr = content.text;
  const tocDebugPath = `claude/toc-${Date.now()}.txt`;
  await appendDebugFile(
    tocDebugPath,
    ["---REQUEST---\n", sourceText, "\n---RESPONSE---\n", jsonStr].join(""),
  ).catch(console.error);
  if (!jsonStr) throw new Error("No content generated");

  jsonStr = jsonStr
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) {
      throw new Error("Invalid TOC format");
    }
    return parsed as string[];
  } catch (error) {
    console.error("Failed to parse TOC JSON:", jsonStr, error);
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
  const debugPath = `claude/chapter-${chapterNumber}-${Date.now()}.txt`;

  await appendDebugFile(
    debugPath,
    [
      "---REQUEST---\n",
      JSON.stringify(
        { toc, chapterTitle, chapterNumber, sourceText, model },
        null,
        2,
      ),
      "\n---RESPONSE---\n",
    ].join(""),
  ).catch(console.error);

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
      const text = chunk.delta.text;
      await appendDebugFile(debugPath, text).catch(console.error);
      yield text;
    }
  }
}
