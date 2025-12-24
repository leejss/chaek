import { PromptSpec } from "../core/types";
import { z } from "zod";

export const ChapterSummarySchema = z.object({
  chapterId: z.string(),
  summary: z
    .string()
    .min(50)
    .max(600)
    .describe("Concise summary of the chapter content"),
  keyTerms: z
    .array(z.string())
    .max(12)
    .optional()
    .describe("Key definitions or terms introduced"),
});

export type SummaryInput = {
  chapterId: string;
  finalText: string;
};

export type ChapterSummaryOutput = z.infer<typeof ChapterSummarySchema>;

declare module "../core/types" {
  interface PromptRegistryMap {
    "book.chapter.summary@v1": {
      input: SummaryInput;
      output: ChapterSummaryOutput;
    };
  }
}

export const summaryV1: PromptSpec<SummaryInput, ChapterSummaryOutput> = {
  id: "book.chapter.summary",
  version: "v1",
  kind: "object",
  schema: ChapterSummarySchema,
  buildMessages: ({ chapterId, finalText }) => [
    {
      role: "system",
      content: `
<role>
You are an expert editor specializing in content continuity and summarization.
</role>

<instructions>
1. Summarize the provided <final_text> to help avoid repetition in later chapters.
2. Capture unique points, decisions, and definitions.
3. Avoid fluff and maintain conciseness.
4. Return the result in the specified JSON format only.
</instructions>
`.trim(),
    },
    {
      role: "user",
      content: `
<chapter_id>${chapterId}</chapter_id>

<task>
Summarize this chapter for continuity control.
</task>

<final_text>
${finalText}
</final_text>
`.trim(),
    },
  ],
};
