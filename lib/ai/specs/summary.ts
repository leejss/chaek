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
      content: "Summarize for continuity control. Return JSON only.",
    },
    {
      role: "user",
      content: [
        `<chapterId>${chapterId}</chapterId>`,
        "<task>Summarize this chapter to help avoid repetition in later chapters.</task>",
        `<finalText>${finalText}</finalText>`,
        "Rules:",
        "- capture unique points, decisions, definitions",
        "- avoid fluff",
      ].join("\n"),
    },
  ],
};
