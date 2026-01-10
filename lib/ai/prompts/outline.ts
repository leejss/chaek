import {
  ChapterOutlineSchema,
  ChapterOutlineOutput,
} from "@/lib/ai/schemas/outline";
import { PlanOutput } from "@/lib/ai/schemas/plan";
import { OutlineInput } from "@/lib/ai/types/prompts";
import { generateObject, LanguageModel, ModelMessage } from "@/lib/ai/core";

const OUTLINE_ROLE = `
<role>
You are an expert book architect and content planner.
You create detailed, well-structured outlines that serve as blueprints for comprehensive chapters.
Your outlines ensure logical flow, complete coverage, and clear learning progression.
</role>
`.trim();

function buildInstructions(language: string): string {
  return `
<instructions>
1. Create a detailed outline for the specified chapter.
2. Break the chapter into 3-6 logical sections.
3. Each section should have:
   - A clear, descriptive title (2-5 words)
   - A summary (1-2 sentences) explaining what will be covered
4. Sections should flow logically and build upon each other.
5. Ensure the outline aligns with the overall <table_of_contents>.
6. Consider what came before and what comes after this chapter.
7. The output MUST be in ${language}.
</instructions>
`.trim();
}

function buildPlanContext(plan: PlanOutput, chapterNumber: number): string {
  const guidelines =
    plan.chapterGuidelines.find((g) => g.chapterIndex === chapterNumber - 1)
      ?.guidelines || "N/A";

  return `
<book_plan_context>
Target Audience: ${plan.targetAudience}
Key Themes: ${plan.keyThemes.join(", ")}
Chapter Guidelines: ${guidelines}
</book_plan_context>
`.trim();
}

function buildMessages(input: OutlineInput): ModelMessage[] {
  const tocFormatted = input.toc.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const userParts = [
    `<table_of_contents>\n${tocFormatted}\n</table_of_contents>`,
    `<source_text>\n${input.sourceText}\n</source_text>`,
    input.plan ? buildPlanContext(input.plan, input.chapterNumber) : "",
    input.userPreference
      ? `<user_preferences>\n${input.userPreference}\n</user_preferences>`
      : "",
    `<task>\nCreate a detailed outline for CHAPTER ${input.chapterNumber}: ${input.chapterTitle}\n</task>`,
  ];

  return [
    {
      role: "system",
      content: `${OUTLINE_ROLE}\n\n${buildInstructions(input.language)}`,
    },
    {
      role: "user",
      content: userParts.filter(Boolean).join("\n\n"),
    },
  ];
}

export async function generateOutline(
  input: OutlineInput,
  model: LanguageModel,
): Promise<ChapterOutlineOutput> {
  return generateObject({
    model,
    messages: buildMessages(input),
    schema: ChapterOutlineSchema,
  });
}
