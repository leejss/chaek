import {
  generateChapterOutline as generateClaudeOutline,
  streamSectionContent as streamClaudeSection,
  streamChapterRefinement as streamClaudeRefinement,
} from "@/lib/ai/claude";
import {
  generateChapterOutline as generateGeminiOutline,
  streamSectionContent as streamGeminiSection,
  streamChapterRefinement as streamGeminiRefinement,
} from "@/lib/ai/gemini";
import {
  AIProvider,
  ChapterOutline,
  ClaudeModel,
  GeminiModel,
  GeneratedChapter,
  Section,
} from "@/lib/book/types";

export type PipelineConfig = {
  provider: AIProvider;
  model: GeminiModel | ClaudeModel;
  toc: string[];
  sourceText: string;
};

export type ChapterGenerationProgress = {
  phase: "outline" | "sections" | "refinement" | "complete";
  chapterNumber: number;
  chapterTitle: string;
  currentSection?: number;
  totalSections?: number;
  content?: string;
};

export async function generateOutline(
  config: PipelineConfig,
  chapterNumber: number,
): Promise<ChapterOutline> {
  const { provider, model, toc, sourceText } = config;
  const chapterTitle = toc[chapterNumber - 1];

  if (!chapterTitle) {
    throw new Error(`Chapter ${chapterNumber} not found in TOC`);
  }

  if (provider === AIProvider.ANTHROPIC) {
    return generateClaudeOutline({
      toc,
      chapterTitle,
      chapterNumber,
      sourceText,
      model: model as ClaudeModel,
    });
  }

  return generateGeminiOutline({
    toc,
    chapterTitle,
    chapterNumber,
    sourceText,
    model: model as GeminiModel,
  });
}

export async function* generateAllOutlines(
  config: PipelineConfig,
): AsyncGenerator<{ chapterNumber: number; outline: ChapterOutline }> {
  for (let i = 0; i < config.toc.length; i++) {
    const chapterNumber = i + 1;
    const outline = await generateOutline(config, chapterNumber);
    yield { chapterNumber, outline };
  }
}

export async function* streamSection(
  config: PipelineConfig,
  outline: ChapterOutline,
  sectionIndex: number,
  previousSections: Section[],
): AsyncGenerator<string> {
  const { provider, model } = config;

  if (provider === AIProvider.ANTHROPIC) {
    yield* streamClaudeSection({
      chapterNumber: outline.chapterNumber,
      chapterTitle: outline.chapterTitle,
      chapterOutline: outline.sections,
      sectionIndex,
      previousSections,
      model: model as ClaudeModel,
    });
  } else {
    yield* streamGeminiSection({
      chapterNumber: outline.chapterNumber,
      chapterTitle: outline.chapterTitle,
      chapterOutline: outline.sections,
      sectionIndex,
      previousSections,
      model: model as GeminiModel,
    });
  }
}

export async function* streamRefinement(
  config: PipelineConfig,
  chapterNumber: number,
  chapterTitle: string,
  assembledContent: string,
): AsyncGenerator<string> {
  const { provider, model, toc } = config;

  if (provider === AIProvider.ANTHROPIC) {
    yield* streamClaudeRefinement({
      toc,
      chapterNumber,
      chapterTitle,
      assembledContent,
      model: model as ClaudeModel,
    });
  } else {
    yield* streamGeminiRefinement({
      toc,
      chapterNumber,
      chapterTitle,
      assembledContent,
      model: model as GeminiModel,
    });
  }
}

export async function* generateChapterWithPipeline(
  config: PipelineConfig,
  chapterNumber: number,
  onProgress?: (progress: ChapterGenerationProgress) => void,
): AsyncGenerator<string, GeneratedChapter, unknown> {
  const chapterTitle = config.toc[chapterNumber - 1];
  if (!chapterTitle) {
    throw new Error(`Chapter ${chapterNumber} not found in TOC`);
  }

  onProgress?.({
    phase: "outline",
    chapterNumber,
    chapterTitle,
  });

  const outline = await generateOutline(config, chapterNumber);

  const sectionsWithContent: Section[] = [];
  let assembledContent = `## ${chapterTitle}\n\n`;

  for (let i = 0; i < outline.sections.length; i++) {
    onProgress?.({
      phase: "sections",
      chapterNumber,
      chapterTitle,
      currentSection: i + 1,
      totalSections: outline.sections.length,
    });

    let sectionContent = "";
    const sectionGenerator = streamSection(
      config,
      outline,
      i,
      sectionsWithContent,
    );

    for await (const chunk of sectionGenerator) {
      sectionContent += chunk;
      yield chunk;
    }

    sectionsWithContent.push({
      ...outline.sections[i],
      content: sectionContent,
    });

    assembledContent += sectionContent + "\n\n";
  }

  onProgress?.({
    phase: "refinement",
    chapterNumber,
    chapterTitle,
  });

  let refinedContent = "";
  const refinementGenerator = streamRefinement(
    config,
    chapterNumber,
    chapterTitle,
    assembledContent,
  );

  for await (const chunk of refinementGenerator) {
    refinedContent += chunk;
    yield chunk;
  }

  onProgress?.({
    phase: "complete",
    chapterNumber,
    chapterTitle,
    content: refinedContent,
  });

  return {
    chapterNumber,
    chapterTitle,
    sections: sectionsWithContent,
    finalContent: refinedContent,
  };
}

export async function* generateBookWithPipeline(
  config: PipelineConfig,
  onProgress?: (progress: ChapterGenerationProgress) => void,
): AsyncGenerator<
  { chapterNumber: number; chunk: string },
  GeneratedChapter[],
  unknown
> {
  const chapters: GeneratedChapter[] = [];

  for (let i = 0; i < config.toc.length; i++) {
    const chapterNumber = i + 1;

    const chapterGenerator = generateChapterWithPipeline(
      config,
      chapterNumber,
      onProgress,
    );

    let result = await chapterGenerator.next();
    while (!result.done) {
      yield { chapterNumber, chunk: result.value };
      result = await chapterGenerator.next();
    }

    chapters.push(result.value);
  }

  return chapters;
}
