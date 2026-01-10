import {
  ChapterSummarySchema,
  ChapterSummaryOutput,
} from "@/lib/ai/schemas/summary";
import { SummaryInput } from "@/lib/ai/types/prompts";
import { generateObject, LanguageModel, ModelMessage } from "@/lib/ai/core";

const SUMMARY_ROLE = `
<role>
You are an expert editor specializing in content continuity and summarization.
</role>
`.trim();

const SUMMARY_INSTRUCTIONS = `
<instructions>
1. Summarize the provided <final_text> to help avoid repetition in later chapters.
2. Capture unique points, decisions, and definitions.
3. Avoid fluff and maintain conciseness.
4. Return the result in the specified JSON format only.
</instructions>
`.trim();

function buildMessages(input: SummaryInput): ModelMessage[] {
  return [
    {
      role: "system",
      content: `${SUMMARY_ROLE}\n\n${SUMMARY_INSTRUCTIONS}`,
    },
    {
      role: "user",
      content: [
        `<chapter_id>${input.chapterId}</chapter_id>`,
        `<task>\nSummarize this chapter for continuity control.\n</task>`,
        `<final_text>\n${input.finalText}\n</final_text>`,
      ].join("\n\n"),
    },
  ];
}

export async function generateSummary(
  input: SummaryInput,
  model: LanguageModel,
): Promise<ChapterSummaryOutput> {
  return generateObject({
    model,
    messages: buildMessages(input),
    schema: ChapterSummarySchema,
  });
}
