"use client";

import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
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
import {
  isInspectorPanelOpen,
  isStructurePanelOpen,
  type WorkspacePanelLayout,
} from "@/components/content-compiler/workspace-navigation";
import { ContentOutline, ContentStructure } from "@/components/content-outline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./content-workspace.module.css";

export function ContentCompilerView({
  initialBuildId,
  initialNodeId,
  initialPanelLayout,
  initialProjectId,
  initialSeedInput = "",
  isAuthenticated,
  signInReturnTo = "/content",
}: {
  initialBuildId: string | null;
  initialNodeId: string | null;
  initialPanelLayout: WorkspacePanelLayout;
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
    handleToggleInspector,
    handleToggleStructure,
    isChapterBuild,
    isCreating,
    isLoadingChapter,
    isLoadingProject,
    isRunning,
    isSelectedChapterGenerating,
    isStartingChapter,
    isWorkspaceActive,
    outlineSummary,
    panelLayout,
    seedInput,
    selectedChapterId,
    summary,
  } = useContentCompilerController({
    initialBuildId,
    initialNodeId,
    initialPanelLayout,
    initialProjectId,
    initialSeedInput,
    isAuthenticated,
  });
  const structureOpen = isStructurePanelOpen(panelLayout);
  const inspectorOpen = isInspectorPanelOpen(panelLayout);

  return (
    <section aria-labelledby="content-title" className="bg-background">
      <h1 className="sr-only" id="content-title">
        {summary?.project.title ?? "콘텐츠 만들기"}
      </h1>

      <div
        className={styles.workspaceGrid}
        data-inspector-open={isWorkspaceActive && inspectorOpen}
        data-structure-open={isWorkspaceActive && structureOpen}
        data-workspace-active={isWorkspaceActive}
      >
        {isWorkspaceActive && structureOpen ? (
          <aside
            className={cn(
              styles.structureRail,
              "flex min-h-0 flex-col bg-muted/25",
            )}
            id="content-structure"
          >
            {outlineSummary ? (
              <ContentStructure
                generatingChapterId={isRunning ? chapterBuildTarget : null}
                onSelectChapter={handleSelectChapter}
                selectedChapterId={selectedChapterId}
                summary={outlineSummary}
              />
            ) : (
              <StructurePlaceholder
                isRunning={isRunning}
                seedInput={seedInput}
              />
            )}
          </aside>
        ) : null}

        <main className={cn(styles.canvas, "min-w-0 bg-card/30")}>
          {isWorkspaceActive ? (
            <WorkspaceToolbar
              inspectorOpen={inspectorOpen}
              onToggleInspector={handleToggleInspector}
              onToggleStructure={handleToggleStructure}
              structureOpen={structureOpen}
            />
          ) : null}

          <div className={styles.canvasScroller}>
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
          </div>
        </main>

        {isWorkspaceActive && inspectorOpen ? (
          <aside
            className={cn(styles.inspector, "min-h-0 bg-muted/20")}
            id="content-inspector"
          >
            {chapterDetail ? (
              <ChapterInspector
                chapter={chapterDetail}
                isGenerating={isStartingChapter || isSelectedChapterGenerating}
                onBack={handleBackToOutline}
                onGenerate={handleGenerateChapter}
              />
            ) : outlineSummary ? (
              <ProjectInspector
                onReset={handleReset}
                summary={outlineSummary}
              />
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
        ) : null}
      </div>
    </section>
  );
}

function WorkspaceToolbar({
  inspectorOpen,
  onToggleInspector,
  onToggleStructure,
  structureOpen,
}: {
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onToggleStructure: () => void;
  structureOpen: boolean;
}) {
  return (
    <div
      aria-label="워크스페이스 패널"
      className={styles.workspaceToolbar}
      role="toolbar"
    >
      <Button
        aria-controls="content-structure"
        aria-expanded={structureOpen}
        onClick={onToggleStructure}
        size="sm"
        type="button"
        variant="ghost"
      >
        <PanelLeftIcon aria-hidden="true" data-icon="inline-start" />
        {structureOpen ? "구조 숨기기" : "구조 열기"}
      </Button>
      <Button
        aria-controls="content-inspector"
        aria-expanded={inspectorOpen}
        onClick={onToggleInspector}
        size="sm"
        type="button"
        variant="ghost"
      >
        <PanelRightIcon aria-hidden="true" data-icon="inline-start" />
        {inspectorOpen ? "정보 숨기기" : "정보 열기"}
      </Button>
    </div>
  );
}
