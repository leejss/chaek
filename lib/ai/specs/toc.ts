import { PromptSpec } from "../core/types";
import { z } from "zod";

export const TocSchema = z.object({
  chapters: z.array(z.string()).describe("List of chapter titles"),
});

export type TocInput = {
  sourceText: string;
  language: string;
  minChapters: number;
  maxChapters: number;
  userPreference?: string;
};

const TOC_ROLE = `
You are an expert educational content strategist and book architect.
You turn messy source material into a clear, teachable learning path.
Your priorities are: logical progression, accurate scope, and reader-friendly chapter naming.
`.trim();

export const tocV1: PromptSpec<TocInput, z.infer<typeof TocSchema>> = {
  id: "book.toc",
  version: "v1",
  kind: "object",
  schema: TocSchema,
  buildMessages: (input) => [
    {
      role: "system",
      content: `${TOC_ROLE}

INSTRUCTIONS:
1. Analyze the SOURCE TEXT to understand its core concepts, key ideas, and information structure.
2. Create ${input.minChapters}-${
        input.maxChapters
      } chapter titles that form a coherent learning path for readers unfamiliar with the topic.
3. Organize chapters in a logical progression:
   - Start with foundational concepts and definitions (Overview, Introduction, Basics)
   - Progress to core mechanisms and how things work (How it works, Core concepts, Architecture)
   - Move to practical applications and use cases (Applications, Use cases, Implementation)
   - End with advanced topics or considerations (Advanced topics, Security, Best practices, Challenges)
4. Each chapter title should be concise and descriptive (2-5 words), clearly indicating what readers will learn.
5. If the SOURCE TEXT is very short or minimal, create chapters that would logically expand on the topic.
6. Chapter titles should be grounded in the SOURCE TEXT, but you may infer logical extensions if the text is limited.
7. Ensure the progression is logical and helps readers build understanding step by step.
8. The output MUST be in ${input.language}.

${
  input.userPreference
    ? `ADDITIONAL USER PREFERENCES:\n${input.userPreference}`
    : ""
}
`.trim(),
    },
    {
      role: "user",
      content: `SOURCE TEXT:
${input.sourceText}`,
    },
  ],
};
