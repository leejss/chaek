import { registry } from "./registry";
import { tocV1 } from "../specs/toc";
import { planV1, PlanOutput } from "../specs/plan";
import { outlineV1 } from "../specs/outline";
import { draftV1 } from "../specs/draft";
import { summaryV1 } from "../specs/summary";
import {
  BookContextState,
  AIProvider,
  GeminiModel,
  ClaudeModel,
} from "@/lib/book/types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { serverEnv } from "@/lib/env";
import { Language, ChapterCount } from "@/lib/book/settings";

/**
 * AI 생성을 위한 설정 타입
 */
export interface GenerationSettings {
  provider?: AIProvider;
  model?: GeminiModel | ClaudeModel;
  language?: Language;
  chapterCount?: ChapterCount;
  userPreference?: string;
}

registry.register(tocV1);
registry.register(planV1);
registry.register(outlineV1);
registry.register(draftV1);
registry.register(summaryV1);

const google = createGoogleGenerativeAI({ apiKey: serverEnv.GEMINI_API_KEY });
const anthropic = createAnthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY });

export class Orchestrator {
  private getModel(
    provider: AIProvider | undefined,
    modelName: string | undefined,
  ) {
    if (provider === AIProvider.ANTHROPIC) {
      return anthropic(modelName || ClaudeModel.HAIKU);
    }

    if (provider === AIProvider.GOOGLE) {
      return google(modelName || GeminiModel.FLASH);
    }

    throw new Error(`Unknown provider: ${provider}`);
  }

  async runNext(context: BookContextState) {
    const { flowStatus, aiConfiguration, sourceText, tableOfContents } =
      context;

    // Determine which spec to run based on status
    if (flowStatus === "generating_toc") {
      const model = this.getModel(
        aiConfiguration.toc.provider,
        aiConfiguration.toc.model,
      );
      // We assume minimal settings for now, can be expanded
      return registry.runSpec(
        "book.toc@v1",
        {
          sourceText,
          language: "Korean", // Default or from settings
          minChapters: 4,
          maxChapters: 10,
          userPreference: "",
        },
        model,
        "object",
      );
    }

    if (flowStatus === "generating_plan") {
      const model = this.getModel(
        aiConfiguration.content.provider,
        aiConfiguration.content.model,
      );
      return registry.runSpec(
        "book.plan@v1",
        {
          sourceText,
          toc: tableOfContents,
          language: "Korean",
        },
        model,
        "object",
      );
    }

    if (flowStatus === "generating_outlines") {
      throw new Error(
        "Orchestrator: generating_outlines handling requires more granular control or is handled by specialized route logic utilizing registry directly.",
      );
    }

    // ... For now, let's expose the capability to run specific specs via helper methods
    // or assume the caller sets the state to "ready for X" and we execute X.
  }

  async generateTOC(sourceText: string, settings: GenerationSettings) {
    const model = this.getModel(settings.provider, settings.model);
    return registry.runSpec(
      "book.toc@v1",
      {
        sourceText,
        language: settings.language || "Korean",
        // Auto는 모델이 직접 챕터 수를 정하게 하는 것입니다.
        minChapters:
          settings.chapterCount === "Auto" ? 5 : settings.chapterCount || 5,
        maxChapters:
          settings.chapterCount === "Auto" ? 10 : settings.chapterCount || 10,
        userPreference: settings.userPreference || "",
      },
      model,
      "object",
    );
  }

  async generatePlan(
    sourceText: string,
    toc: string[],
    settings: GenerationSettings,
  ) {
    const model = this.getModel(settings.provider, settings.model);
    return registry.runSpec(
      "book.plan@v1",
      {
        sourceText,
        toc,
        language: settings.language || "Korean",
      },
      model,
      "object",
    );
  }

  async generateChapterOutline(params: {
    toc: string[];
    chapterTitle: string;
    chapterNumber: number;
    sourceText: string;
    bookPlan: PlanOutput;
    settings: GenerationSettings;
  }) {
    const model = this.getModel(
      params.settings.provider,
      params.settings.model,
    );
    return registry.runSpec(
      "book.chapter.outline@v1",
      {
        toc: params.toc,
        chapterTitle: params.chapterTitle,
        chapterNumber: params.chapterNumber,
        sourceText: params.sourceText,
        plan: params.bookPlan,
        language: params.settings.language || "Korean",
        userPreference: params.settings.userPreference,
      },
      model,
      "object",
    );
  }

  async streamSectionDraft(params: {
    chapterNumber: number;
    chapterTitle: string;
    chapterOutline: Array<{ title: string; summary: string }>;
    sectionIndex: number;
    previousSections: Array<{ title: string; summary: string }>;
    bookPlan: PlanOutput;
    settings: GenerationSettings;
  }) {
    const model = this.getModel(
      params.settings.provider,
      params.settings.model,
    );
    return registry.runSpec(
      "book.chapter.draft@v1",
      {
        chapterNumber: params.chapterNumber,
        chapterTitle: params.chapterTitle,
        chapterOutline: params.chapterOutline,
        sectionIndex: params.sectionIndex,
        previousSections: params.previousSections,
        plan: params.bookPlan,
        language: params.settings.language || "Korean",
        userPreference: params.settings.userPreference,
      },
      model,
      "stream",
    );
  }

  async generateChapterSummary(
    chapterId: string,
    finalText: string,
    settings: GenerationSettings,
  ) {
    const model = this.getModel(settings.provider, settings.model);
    return registry.runSpec(
      "book.chapter.summary@v1",
      {
        chapterId,
        finalText,
      },
      model,
      "object",
    );
  }
}

export const orchestrator = new Orchestrator();
