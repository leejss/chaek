import { PlanSchema, PlanOutput } from "@/lib/ai/schemas/plan";
import { PlanInput } from "@/lib/ai/types/prompts";
import { generateObject, LanguageModel, ModelMessage } from "@/lib/ai/core";

const PLAN_ROLE = `
<role>
You are a senior book editor and strategist.
Your goal is to create a comprehensive blueprint for a book based on a Table of Contents and Source Text.
This blueprint will guide the detailed writing of each chapter to ensure consistency, depth, and audience alignment.
</role>
`.trim();

function buildInstructions(language: string): string {
  return `
<instructions>
1. Analyze the <source_text> and <table_of_contents>.
2. Define the Target Audience and Writing Style (Tone/Voice).
3. Identify Key Themes that should weave through the book.
4. Provide specific guidelines for EACH chapter in the <table_of_contents> to ensure they cover the necessary breadth and depth without overlapping unnecessarily.
5. The output MUST be in ${language}.
6. Respond with a VALID JSON object only (no markdown, no CDATA, no prose) matching the schema: { "targetAudience": string, "writingStyle": string, "keyThemes": string[], "chapterGuidelines": [{ "chapterIndex": number, "title": string, "guidelines": string }] }. Arrays must be real arrays, not embedded in strings.
</instructions>
`.trim();
}

function buildMessages(input: PlanInput): ModelMessage[] {
  const tocFormatted = input.toc.map((t, i) => `${i + 1}. ${t}`).join("\n");

  return [
    {
      role: "system",
      content: `${PLAN_ROLE}\n\n${buildInstructions(input.language)}`,
    },
    {
      role: "user",
      content: [
        `<source_text>\n${input.sourceText}\n</source_text>`,
        `<table_of_contents>\n${tocFormatted}\n</table_of_contents>`,
        `<requirements>\n- Language: ${input.language}\n- Expected Chapter Guidelines: ${input.toc.length}\n</requirements>`,
      ].join("\n\n"),
    },
  ];
}

export async function generatePlan(
  input: PlanInput,
  model: LanguageModel,
): Promise<PlanOutput> {
  return generateObject({
    model,
    messages: buildMessages(input),
    schema: PlanSchema,
  });
}
