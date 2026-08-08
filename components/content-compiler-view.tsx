"use client";

import { ChapterInspector, ChapterReader } from "@/components/chapter-reader";
import {
  ChapterLoadingView,
  ErrorNotice,
  NewContentCanvas,
  PlanningCanvas,
  StructurePlaceholder,
} from "@/components/content-compiler/compiler-canvases";
import {
  BuildInspector,
  CreationInspector,
  ProjectInspector,
} from "@/components/content-compiler/compiler-inspectors";
import { useContentCompilerController } from "@/components/content-compiler/use-content-compiler-controller";
import { ContentOutline, ContentStructure } from "@/components/content-outline";
import { cn } from "@/lib/utils";

import styles from "./content-workspace.module.css";

export function ContentCompilerView({
  initialBuildId,
  initialNodeId,
  initialProjectId,
  initialSeedInput = "",
  isAuthenticated,
  signInReturnTo = "/content",
}: {
  initialBuildId: string | null;
  initialNodeId: string | null;
  initialProjectId: string | null;
  initialSeedInput?: string;
  isAuthenticated: boolean;
  signInReturnTo?: string;
}) {
  const {
    activeBuild,
    buildStatus,
    chapterBuildTarget,
    chapterDetail,
    errorMessage,
    handleBackToOutline,
    handleCreate,
    handleGenerateChapter,
    handleReset,
    handleSeedChange,
    handleSelectChapter,
    isChapterBuild,
    isCreating,
    isLoadingChapter,
    isLoadingProject,
    isRunning,
    isSelectedChapterGenerating,
    isStartingChapter,
    outlineSummary,
    seedInput,
    selectedChapterId,
    summary,
  } = useContentCompilerController({
    initialBuildId,
    initialNodeId,
    initialProjectId,
    initialSeedInput,
    isAuthenticated,
  });

  return (
    <section aria-labelledby="content-title" className="bg-background">
      <h1 className="sr-only" id="content-title">
        {summary?.project.title ?? "콘텐츠 만들기"}
      </h1>

      <div className={styles.workspaceGrid}>
        <aside
          className={cn(
            styles.structureRail,
            "flex min-h-0 flex-col bg-muted/25",
          )}
        >
          {outlineSummary ? (
            <ContentStructure
              generatingChapterId={isRunning ? chapterBuildTarget : null}
              onSelectChapter={handleSelectChapter}
              selectedChapterId={selectedChapterId}
              summary={outlineSummary}
            />
          ) : (
            <StructurePlaceholder isRunning={isRunning} seedInput={seedInput} />
          )}
        </aside>

        <main
          className={cn(styles.canvas, "min-w-0 bg-card/30 md:col-start-2")}
        >
          {errorMessage ? <ErrorNotice message={errorMessage} /> : null}

          {chapterDetail ? (
            <ChapterReader chapter={chapterDetail} />
          ) : outlineSummary && !selectedChapterId ? (
            <ContentOutline summary={outlineSummary} />
          ) : isLoadingProject || isLoadingChapter ? (
            <ChapterLoadingView
              label={
                isLoadingProject
                  ? "콘텐츠를 불러오고 있습니다"
                  : "Chapter를 불러오고 있습니다"
              }
            />
          ) : activeBuild ? (
            <PlanningCanvas
              buildStatus={buildStatus}
              isChapterBuild={isChapterBuild}
              seedInput={seedInput}
            />
          ) : (
            <NewContentCanvas
              isAuthenticated={isAuthenticated}
              isCreating={isCreating}
              onSeedChange={handleSeedChange}
              onSubmit={handleCreate}
              seedInput={seedInput}
              signInReturnTo={signInReturnTo}
            />
          )}
        </main>

        <aside
          className={cn(styles.inspector, "min-h-0 bg-muted/20 md:col-start-2")}
        >
          {chapterDetail ? (
            <ChapterInspector
              chapter={chapterDetail}
              isGenerating={isStartingChapter || isSelectedChapterGenerating}
              onBack={handleBackToOutline}
              onGenerate={handleGenerateChapter}
            />
          ) : outlineSummary ? (
            <ProjectInspector onReset={handleReset} summary={outlineSummary} />
          ) : activeBuild ? (
            <BuildInspector
              buildStatus={buildStatus}
              isChapterBuild={isChapterBuild}
              isRunning={isRunning}
              onReset={handleReset}
            />
          ) : (
            <CreationInspector />
          )}
        </aside>
      </div>
    </section>
  );
}
