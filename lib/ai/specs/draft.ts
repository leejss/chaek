import { PromptSpec } from "../core/types";
import { PlanOutput } from "./plan";

export type DraftInput = {
  chapterNumber: number;
  chapterTitle: string;
  chapterOutline: Array<{ title: string; summary: string }>;
  sectionIndex: number;
  previousSections: Array<{ title: string; summary: string }>; // Or summaries details?
  language: string;
  userPreference?: string;
  plan?: PlanOutput;
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

export const draftV1: PromptSpec<DraftInput, void> = {
  id: "book.chapter.draft",
  version: "v1",
  kind: "stream", // Streaming text
  buildMessages: (input) => {
    const currentSection = input.chapterOutline[input.sectionIndex];
    if (!currentSection) throw new Error("Section not found");

    const outlineText = input.chapterOutline
      .map((s, i) => `${i + 1}. ${s.title}: ${s.summary}`)
      .join("\n");

    const previousText =
      input.previousSections.length > 0
        ? input.previousSections
            .map((s) => `- ${s.title}: ${s.summary}`)
            .join("\n")
        : "(This is the first section)";

    return [
      {
        role: "system",
        content: `${CHAPTER_ROLE}

<instructions>
1. Write ONLY the specified section content in Markdown.
2. Use '### ' for section headings.
3. Write comprehensive, engaging, and educational content.
4. Maintain consistency with the <chapter_context> and overall book tone.
5. Include relevant examples, explanations, and details.
6. Do NOT include content from other sections.
7. Target 300-600 words per section.
8. The output MUST be in ${input.language}.
</instructions>
`.trim(),
      },
      {
        role: "user",
        content: `
${
  input.plan
    ? `<book_plan_context>
Writing Style: ${input.plan.writingStyle}
Key Themes: ${input.plan.keyThemes.join(", ")}
Target Audience: ${input.plan.targetAudience}
</book_plan_context>`
    : ""
}

<chapter_context>
Chapter ${input.chapterNumber}: ${input.chapterTitle}
</chapter_context>

<chapter_outline>
${outlineText}
</chapter_outline>

<previous_sections_summary>
${previousText}
</previous_sections_summary>

${
  input.userPreference
    ? `<user_preferences>\n${input.userPreference}\n</user_preferences>`
    : ""
}

<task>
Write the content for section "${currentSection.title}":
${currentSection.summary}
</task>
`.trim(),
      },
    ];
  },
};
