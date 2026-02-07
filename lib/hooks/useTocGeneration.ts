"use client";

import {
  failTocGeneration,
  setTocResult,
  startTocGeneration,
  useBookCreationStore,
} from "@/context/bookCreationStore";
import { generateTocAction } from "@/lib/actions/ai";

export function useTocGeneration() {
  const generate = async (variant: "initial" | "regenerate"): Promise<boolean> => {
    const { sourceText, language, chapterCount, userPreference, tocProvider, tocModel } =
      useBookCreationStore.getState();

    if (!sourceText?.trim()) return false;

    startTocGeneration(variant);

    try {
      const result = await generateTocAction({
        sourceText,
        language,
        chapterCount,
        userPreference,
        provider: tocProvider,
        model: tocModel,
      });

      setTocResult(result.title, result.chapters);
      return true;
    } catch (err) {
      console.error(`TOC ${variant} failed:`, err);
      failTocGeneration(
        variant === "initial"
          ? "TOC 생성에 실패했습니다. 다시 시도해 주세요."
          : "TOC 재생성에 실패했습니다. 다시 시도해 주세요.",
      );
      return false;
    }
  };

  return { generate };
}
