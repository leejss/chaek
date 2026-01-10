import { PlanOutput } from "@/lib/ai/schemas/plan";
import { Section } from "@/lib/ai/schemas/outline";
import { DraftInput } from "@/lib/ai/types/prompts";
import { streamText, LanguageModel, ModelMessage } from "@/lib/ai/core";

const CHAPTER_ROLE = `
<role>
You are a professional non-fiction author and meticulous editor.
You write clear, engaging, and well-structured instructional prose.
You keep terminology consistent across chapters and maintain a cohesive narrative voice.
</role>
`.trim();

function buildInstructions(language: string): string {
  return `
<instructions>
1. Write ONLY the specified section content in Markdown.
2. **Heading Rule**:
   - Start the section with '### ' followed by the section title.
  - The very first characters of the output MUST be '### ' (start at column 1).
  - Always place headings on their own line: ensure there are TWO newlines (a blank line) before any '### ' or '#### ' heading.
  - NEVER attach a heading immediately after a sentence (e.g., '...text### Title').
   - Use '#### ' for sub-headings within this section.
   - **NEVER use '#' or '##' headings** as they are reserved for Book and Chapter titles.
3. Write comprehensive, engaging, and educational content.
4. Maintain consistency with the <chapter_context> and overall book tone.
5. Include relevant examples, explanations, and details.
6. Do NOT include content from other sections.
7. Do NOT include any introductory or concluding remarks like "Certainly" or "Here is the content".
8. Target 300-600 words per section.
9. The output MUST be in ${language}.
</instructions>
`.trim();
}

function buildPlanContext(plan: PlanOutput): string {
  return `
<book_plan_context>
Writing Style: ${plan.writingStyle}
Key Themes: ${plan.keyThemes.join(", ")}
Target Audience: ${plan.targetAudience}
</book_plan_context>
`.trim();
}

function buildChapterOutline(outline: Section[]): string {
  const formatted = outline
    .map((s, i) => `${i + 1}. ${s.title}: ${s.summary}`)
    .join("\n");
  return `<chapter_outline>\n${formatted}\n</chapter_outline>`;
}

function buildPreviousSections(sections: Section[]): string {
  const text =
    sections.length > 0
      ? sections.map((s) => `- ${s.title}: ${s.summary}`).join("\n")
      : "(This is the first section)";
  return `<previous_sections_summary>\n${text}\n</previous_sections_summary>`;
}

function buildMessages(input: DraftInput): ModelMessage[] {
  const currentSection = input.chapterOutline[input.sectionIndex];
  if (!currentSection) throw new Error("Section not found");

  const userParts = [
    buildPlanContext(input.plan),
    `<chapter_context>\nChapter ${input.chapterNumber}: ${input.chapterTitle}\n</chapter_context>`,
    buildChapterOutline(input.chapterOutline),
    buildPreviousSections(input.previousSections),
    input.userPreference
      ? `<user_preferences>\n${input.userPreference}\n</user_preferences>`
      : "",
    `<task>\nWrite the content for section "${currentSection.title}":\n${currentSection.summary}\n</task>`,
  ];

  return [
    {
      role: "system",
      content: `${CHAPTER_ROLE}\n\n${buildInstructions(input.language)}`,
    },
    {
      role: "user",
      content: userParts.filter(Boolean).join("\n\n"),
    },
  ];
}

export function streamDraft(input: DraftInput, model: LanguageModel) {
  return streamText({
    model,
    messages: buildMessages(input),
  });
}
