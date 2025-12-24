import { PromptSpec } from "../core/types";
import { z } from "zod";

export const PlanSchema = z.object({
  targetAudience: z.string().describe("The primary audience for this book"),
  writingStyle: z
    .string()
    .describe("The tone and voice to be used throughout the book"),
  keyThemes: z
    .array(z.string())
    .describe("Major themes to be consistently addressed"),
  chapterGuidelines: z
    .array(
      z.object({
        chapterIndex: z.number(),
        title: z.string().describe("The title of the chapter"),
        guidelines: z
          .string()
          .describe("Specific instructions or focus for this chapter"),
      }),
    )
    .describe("High-level guidelines for each chapter"),
});

export type PlanInput = {
  sourceText: string;
  toc: string[];
  language: string;
};

export type PlanOutput = z.infer<typeof PlanSchema>;

declare module "../core/types" {
  interface PromptRegistryMap {
    "book.plan@v1": {
      input: PlanInput;
      output: PlanOutput;
    };
  }
}

const PLAN_ROLE = `
<role>
You are a senior book editor and strategist.
Your goal is to create a comprehensive blueprint for a book based on a Table of Contents and Source Text.
This blueprint will guide the detailed writing of each chapter to ensure consistency, depth, and audience alignment.
</role>
`.trim();

export const planV1: PromptSpec<PlanInput, PlanOutput> = {
  id: "book.plan",
  version: "v1",
  kind: "object",
  schema: PlanSchema,
  buildMessages: (input) => [
    {
      role: "system",
      content: `${PLAN_ROLE}

<instructions>
1. Analyze the <source_text> and <table_of_contents>.
2. Define the Target Audience and Writing Style (Tone/Voice).
3. Identify Key Themes that should weave through the book.
4. Provide specific guidelines for EACH chapter in the <table_of_contents> to ensure they cover the necessary breadth and depth without overlapping unnecessarily.
5. The output MUST be in ${input.language}.
</instructions>
`.trim(),
    },
    {
      role: "user",
      content: `
<source_text>
${input.sourceText}
</source_text>

<table_of_contents>
${input.toc.map((t, i) => `${i + 1}. ${t}`).join("\n")}
</table_of_contents>

<requirements>
- Language: ${input.language}
- Expected Chapter Guidelines: ${input.toc.length}
</requirements>
`.trim(),
    },
  ],
};
