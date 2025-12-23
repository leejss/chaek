import { PromptSpec } from "../core/types";
import { z } from "zod";

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

export type OutlineInput = {
  toc: string[];
  chapterTitle: string;
  chapterNumber: number;
  sourceText: string;
  plan?: any; // book.plan output
  language: string;
  userPreference?: string;
};

const OUTLINE_ROLE = `
You are an expert book architect and content planner.
You create detailed, well-structured outlines that serve as blueprints for comprehensive chapters.
Your outlines ensure logical flow, complete coverage, and clear learning progression.
`.trim();

export const outlineV1: PromptSpec<
  OutlineInput,
  z.infer<typeof ChapterOutlineSchema>
> = {
  id: "book.chapter.outline",
  version: "v1",
  kind: "object",
  schema: ChapterOutlineSchema,
  buildMessages: (input) => [
    {
      role: "system",
      content: `${OUTLINE_ROLE}

INSTRUCTIONS:
1. Create a detailed outline for the specified chapter.
2. Break the chapter into 3-6 logical sections.
3. Each section should have:
   - A clear, descriptive title (2-5 words)
   - A summary (1-2 sentences) explaining what will be covered
4. Sections should flow logically and build upon each other.
5. Ensure the outline aligns with the overall book structure (TOC).
6. Consider what came before and what comes after this chapter.
7. The output MUST be in ${input.language}.

${
  input.plan
    ? `BOOK PLAN CONTEXT:
Target Audience: ${input.plan.targetAudience}
Key Themes: ${input.plan.keyThemes.join(", ")}
Chapter Guidelines: ${
        input.plan.chapterGuidelines.find(
          (g: any) => g.chapterIndex === input.chapterNumber - 1,
        )?.guidelines || "N/A"
      }`
    : ""
}

${
  input.userPreference
    ? `ADDITIONAL USER PREFERENCES:\n${input.userPreference}`
    : ""
}
`.trim(),
    },
    {
      role: "user",
      content: `TABLE OF CONTENTS:
${input.toc.map((t, i) => `${i + 1}. ${t}`).join("\n")}

SOURCE TEXT (for reference):
${input.sourceText}

Create a detailed outline for CHAPTER ${input.chapterNumber}: ${
        input.chapterTitle
      }`,
    },
  ],
};
