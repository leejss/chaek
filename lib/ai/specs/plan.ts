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

function createPlanInstructions(input: PlanInput): string {
  return `
<instructions>
1. Analyze the <source_text> and <table_of_contents>.
2. Define the Target Audience and Writing Style (Tone/Voice).
3. Identify Key Themes that should weave through the book.
4. Provide specific guidelines for EACH chapter in the <table_of_contents> to ensure they cover the necessary breadth and depth without overlapping unnecessarily.
5. The output MUST be in ${input.language}.
6. Respond with a VALID JSON object only (no markdown, no CDATA, no prose) matching the schema: { "targetAudience": string, "writingStyle": string, "keyThemes": string[], "chapterGuidelines": [{ "chapterIndex": number, "title": string, "guidelines": string }] }. Arrays must be real arrays, not embedded in strings.
</instructions>
`.trim();
}

function createSourceText(sourceText: string): string {
  return `
<source_text>
${sourceText}
</source_text>
`.trim();
}

function createTableOfContents(toc: string[]): string {
  return `
<table_of_contents>
${toc.map((t, i) => `${i + 1}. ${t}`).join("\n")}
</table_of_contents>
`.trim();
}

function createRequirements(language: string, tocLength: number): string {
  return `
<requirements>
- Language: ${language}
- Expected Chapter Guidelines: ${tocLength}
</requirements>
`.trim();
}

export const planV1: PromptSpec<PlanInput, PlanOutput> = {
  id: "book.plan",
  version: "v1",
  kind: "object",
  schema: PlanSchema,
  buildMessages: (input) => [
    {
      role: "system",
      content: `${PLAN_ROLE}

${createPlanInstructions(input)}`.trim(),
    },
    {
      role: "user",
      content: [
        createSourceText(input.sourceText),
        createTableOfContents(input.toc),
        createRequirements(input.language, input.toc.length),
      ].join("\n\n").trim(),
    },
  ],
};
