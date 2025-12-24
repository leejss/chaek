import { PromptSpec } from "../core/types";
import { z } from "zod";
import { PlanOutput } from "./plan";

export const ChapterOutlineSchema = z.object({
  chapterNumber: z.number(),
  chapterTitle: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
    }),
  ),
});

export type ChapterOutlineOutput = z.infer<typeof ChapterOutlineSchema>;

export type OutlineInput = {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  plan?: PlanOutput;
  language: string;
  userPreference?: string;
};

declare module "../core/types" {
  interface PromptRegistryMap {
    "book.chapter.outline@v1": {
      input: OutlineInput;
      output: ChapterOutlineOutput;
    };
  }
}

const OUTLINE_ROLE = `
<role>
You are an expert book architect and content planner.
You create detailed, well-structured outlines that serve as blueprints for comprehensive chapters.
Your outlines ensure logical flow, complete coverage, and clear learning progression.
</role>
`.trim();

export const outlineV1: PromptSpec<OutlineInput, ChapterOutlineOutput> = {
  id: "book.chapter.outline",
  version: "v1",
  kind: "object",
  schema: ChapterOutlineSchema,
  buildMessages: (input) => [
    {
      role: "system",
      content: `${OUTLINE_ROLE}

<instructions>
1. Create a detailed outline for the specified chapter.
2. Break the chapter into 3-6 logical sections.
3. Each section should have:
   - A clear, descriptive title (2-5 words)
   - A summary (1-2 sentences) explaining what will be covered
4. Sections should flow logically and build upon each other.
5. Ensure the outline aligns with the overall <table_of_contents>.
6. Consider what came before and what comes after this chapter.
7. The output MUST be in ${input.language}.
</instructions>
`.trim(),
    },
    {
      role: "user",
      content: `
<table_of_contents>
${input.toc.map((t, i) => `${i + 1}. ${t}`).join("\n")}
</table_of_contents>

<source_text>
${input.sourceText}
</source_text>

${
  input.plan
    ? `<book_plan_context>
Target Audience: ${input.plan.targetAudience}
Key Themes: ${input.plan.keyThemes.join(", ")}
Chapter Guidelines: ${
        input.plan.chapterGuidelines.find(
          (g) => g.chapterIndex === input.chapterNumber - 1,
        )?.guidelines || "N/A"
      }
</book_plan_context>`
    : ""
}

${
  input.userPreference
    ? `<user_preferences>\n${input.userPreference}\n</user_preferences>`
    : ""
}

<task>
Create a detailed outline for CHAPTER ${input.chapterNumber}: ${
        input.chapterTitle
      }
</task>
`.trim(),
    },
  ],
};
