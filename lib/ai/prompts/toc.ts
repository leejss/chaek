import { TocSchema, TocOutput } from "@/lib/ai/schemas/toc";
import { TocInput } from "@/lib/ai/types/prompts";
import { generateObject, LanguageModel, ModelMessage } from "@/lib/ai/core";

const TOC_ROLE = `
<role>
You are an expert educational content strategist and book architect.
You turn messy source material into a clear, teachable learning path.
Your priorities are: logical progression, accurate scope, and reader-friendly chapter naming.
</role>
`.trim();

function buildInstructions(input: TocInput): string {
  const chapterCountText =
    input.minChapters === input.maxChapters
      ? `exactly ${input.minChapters}`
      : `${input.minChapters}-${input.maxChapters}`;

  return `
<instructions>
1. Analyze the <source_text> to understand its core concepts, key ideas, and information structure.
2. Create a compelling book title that captures the essence of the content and appeals to the target audience.
3. Create ${chapterCountText} chapter titles that form a coherent learning path for readers unfamiliar with the topic.
   - The output MUST contain exactly the same number of items as requested.
4. Organize chapters in a logical progression:
   - Start with foundational concepts and definitions (Overview, Introduction, Basics)
   - Progress to core mechanisms and how things work (How it works, Core concepts, Architecture)
   - Move to practical applications and use cases (Applications, Use cases, Implementation)
   - End with advanced topics or considerations (Advanced topics, Security, Best practices, Challenges)
5. Each chapter title should be concise and descriptive (2-5 words), clearly indicating what readers will learn.
6. If the <source_text> is very short or minimal, create chapters that would logically expand on the topic.
7. Chapter titles should be grounded in the <source_text>, but you may infer logical extensions if the text is limited.
8. Ensure the progression is logical and helps readers build understanding step by step.
9. The output MUST be in ${input.language}.
</instructions>
`.trim();
}

function buildMessages(input: TocInput): ModelMessage[] {
  const userParts = [
    `<source_text>\n${input.sourceText}\n</source_text>`,
    input.userPreference
      ? `<user_preferences>\n${input.userPreference}\n</user_preferences>`
      : "",
  ];

  return [
    {
      role: "system",
      content: `${TOC_ROLE}\n\n${buildInstructions(input)}`,
    },
    {
      role: "user",
      content: userParts.filter(Boolean).join("\n\n"),
    },
  ];
}

export async function generateToc(
  input: TocInput,
  model: LanguageModel,
): Promise<TocOutput> {
  return generateObject({
    model,
    messages: buildMessages(input),
    schema: TocSchema,
  });
}
