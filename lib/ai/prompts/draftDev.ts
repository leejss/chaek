import { DraftInput } from "@/lib/ai/types/prompts";
import { streamText, LanguageModel, ModelMessage } from "@/lib/ai/core";

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

export function streamDraftDev(input: DraftInput, model: LanguageModel) {
  return streamText({
    model,
    messages: buildMessages(input),
  });
}
