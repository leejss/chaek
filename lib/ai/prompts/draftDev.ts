import { generateText, type LanguageModel, type ModelMessage } from "@/lib/ai/core";
import type { DraftInput } from "@/lib/ai/types/prompts";

function buildMessages(input: DraftInput): ModelMessage[] {
  const currentSection = input.chapterOutline[input.sectionIndex];

  return [
    {
      role: "system",
      content:
        "You are a helpful assistant for book writing development. Write a very brief, simple draft for the given section. Keep it under 100 words. Focus on speed and simplicity.",
    },
    {
      role: "user",
      content: `
Chapter: ${input.chapterTitle}
Section: ${currentSection?.title}
Summary to expand: ${currentSection?.summary}

Please write a simple draft in ${input.language}.
      `.trim(),
    },
  ];
}

export async function generateDraftTextDev(
  input: DraftInput,
  model: LanguageModel,
): Promise<string> {
  return generateText({
    model,
    messages: buildMessages(input),
  });
}
