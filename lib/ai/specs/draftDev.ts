import { PromptSpec } from "../core/types";
import { DraftInput } from "./draft";

declare module "../core/types" {
  interface PromptRegistryMap {
    "book.chapter.draftDev@v1": {
      input: DraftInput;
      output: void;
    };
  }
}

export const draftDevV1: PromptSpec<DraftInput, void> = {
  id: "book.chapter.draftDev",
  version: "v1",
  kind: "stream",
  buildMessages: (input) => {
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
  },
};
