import { PromptSpec } from "../core/types";
import { PlanOutput } from "./plan";

export type Section = {
  title: string;
  summary: string;
};

export type DraftInput = {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Section[];
  sectionIndex: number;
  previousSections: Section[];
  language: string;
  userPreference?: string;
  plan: PlanOutput;
};

declare module "../core/types" {
  interface PromptRegistryMap {
    "book.chapter.draft@v1": {
      input: DraftInput;
      output: void; // stream doesn't use output type
    };
  }
}

const CHAPTER_ROLE = `
<role>
You are a professional non-fiction author and meticulous editor.
You write clear, engaging, and well-structured instructional prose.
You keep terminology consistent across chapters and maintain a cohesive narrative voice.
</role>
`.trim();

function createInstructions(input: DraftInput): string {
  return `
<instructions>
1. Write ONLY the specified section content in Markdown.
2. **Heading Rule**:
   - Start the section with '### ' followed by the section title.
   - Use '#### ' for sub-headings within this section.
   - **NEVER use '#' or '##' headings** as they are reserved for Book and Chapter titles.
3. Write comprehensive, engaging, and educational content.
4. Maintain consistency with the <chapter_context> and overall book tone.
5. Include relevant examples, explanations, and details.
6. Do NOT include content from other sections.
7. Do NOT include any introductory or concluding remarks like "Certainly" or "Here is the content".
8. Target 300-600 words per section.
9. The output MUST be in ${input.language}.
</instructions>
`.trim();
}

function createBookPlanContext(plan: PlanOutput): string {
  return `
<book_plan_context>
Writing Style: ${plan.writingStyle}
Key Themes: ${plan.keyThemes.join(", ")}
Target Audience: ${plan.targetAudience}
</book_plan_context>
`.trim();
}

function createChapterContext(chapterNumber: number, chapterTitle: string): string {
  return `
<chapter_context>
Chapter ${chapterNumber}: ${chapterTitle}
</chapter_context>
`.trim();
}

function createChapterOutline(outline: Section[]): string {
  return `
<chapter_outline>
${outline.map((s, i) => `${i + 1}. ${s.title}: ${s.summary}`).join("\n")}
</chapter_outline>
`.trim();
}

function createPreviousSectionsSummary(previousSections: Section[]): string {
  const text = previousSections.length > 0
    ? previousSections.map((s) => `- ${s.title}: ${s.summary}`).join("\n")
    : "(This is the first section)";
  return `
<previous_sections_summary>
${text}
</previous_sections_summary>
`.trim();
}

function createUserPreferences(userPreference: string): string {
  return `
<user_preferences>
${userPreference}
</user_preferences>
`.trim();
}

function createTask(title: string, summary: string): string {
  return `
<task>
Write the content for section "${title}":
${summary}
</task>
`.trim();
}

export const draftV1: PromptSpec<DraftInput, void> = {
  id: "book.chapter.draft",
  version: "v1",
  kind: "stream",
  buildMessages: (input) => {
    const currentSection = input.chapterOutline[input.sectionIndex];
    if (!currentSection) throw new Error("Section not found");

    return [
      {
        role: "system",
        content: `${CHAPTER_ROLE}

${createInstructions(input)}`.trim(),
      },
      {
        role: "user",
        content: [
          input.plan ? createBookPlanContext(input.plan) : "",
          createChapterContext(input.chapterNumber, input.chapterTitle),
          createChapterOutline(input.chapterOutline),
          createPreviousSectionsSummary(input.previousSections),
          input.userPreference ? createUserPreferences(input.userPreference) : "",
          createTask(currentSection.title, currentSection.summary),
        ].filter(Boolean).join("\n\n").trim(),
      },
    ];
  },
};
