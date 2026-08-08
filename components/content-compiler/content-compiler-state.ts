import type { ChapterDetail } from "@/components/chapter-reader";
import type { WorkspacePanelLayout } from "@/components/content-compiler/workspace-navigation";
import type { ProjectSummary } from "@/components/content-outline";
import type { ActiveBuild } from "@/lib/content/contracts/workspace-api";

export type ContentCompilerState = {
  activeBuild: ActiveBuild | null;
  chapterDetail: ChapterDetail | null;
  errorMessage: string | null;
  isCreating: boolean;
  isLoadingChapter: boolean;
  isLoadingProject: boolean;
  isStartingChapter: boolean;
  isWorkspaceActive: boolean;
  panelLayout: WorkspacePanelLayout;
  seedInput: string;
  selectedChapterId: string | null;
  summary: ProjectSummary | null;
};

export type ContentCompilerAction =
  | { type: "backToOutline" }
  | { type: "buildStarted"; activeBuild: ActiveBuild }
  | { type: "chapterGenerationFinished" }
  | { type: "chapterGenerationStarted" }
  | { type: "chapterLoadFailed"; message: string; nodeId: string }
  | { type: "chapterLoadingStopped"; nodeId: string }
  | { type: "chapterLoaded"; chapter: ChapterDetail; nodeId: string }
  | { type: "chapterSelected"; nodeId: string }
  | { type: "createFinished" }
  | { type: "createStarted" }
  | { type: "errorChanged"; message: string | null }
  | { type: "panelLayoutChanged"; panelLayout: WorkspacePanelLayout }
  | {
      type: "projectLoadFailed";
      message: string;
    }
  | {
      type: "projectLoaded";
      chapter: ChapterDetail | null;
      nodeId: string | null;
      summary: ProjectSummary;
    }
  | { type: "reset" }
  | { type: "seedChanged"; value: string }
  | { type: "summaryLoaded"; summary: ProjectSummary };

export function createContentCompilerState({
  initialBuildId,
  initialNodeId,
  initialPanelLayout,
  initialProjectId,
  initialSeedInput,
}: {
  initialBuildId: string | null;
  initialNodeId: string | null;
  initialPanelLayout: WorkspacePanelLayout;
  initialProjectId: string | null;
  initialSeedInput: string;
}): ContentCompilerState {
  return {
    activeBuild:
      initialBuildId && initialProjectId
        ? { buildId: initialBuildId, projectId: initialProjectId }
        : null,
    chapterDetail: null,
    errorMessage: null,
    isCreating: false,
    isLoadingChapter: Boolean(initialNodeId),
    isLoadingProject: Boolean(initialProjectId && !initialBuildId),
    isStartingChapter: false,
    isWorkspaceActive: Boolean(initialProjectId || initialBuildId),
    panelLayout: initialPanelLayout,
    seedInput: initialSeedInput,
    selectedChapterId: initialNodeId,
    summary: null,
  };
}

export function contentCompilerReducer(
  state: ContentCompilerState,
  action: ContentCompilerAction,
): ContentCompilerState {
  switch (action.type) {
    case "backToOutline":
      return {
        ...state,
        chapterDetail: null,
        isLoadingChapter: false,
        isStartingChapter: false,
        selectedChapterId: null,
      };
    case "buildStarted":
      return {
        ...state,
        activeBuild: action.activeBuild,
        errorMessage: null,
        isWorkspaceActive: true,
      };
    case "chapterGenerationFinished":
      return { ...state, isStartingChapter: false };
    case "chapterGenerationStarted":
      return { ...state, errorMessage: null, isStartingChapter: true };
    case "chapterLoadFailed":
      if (state.selectedChapterId !== action.nodeId) {
        return state;
      }

      return {
        ...state,
        chapterDetail: null,
        errorMessage: action.message,
        isLoadingChapter: false,
        selectedChapterId: null,
      };
    case "chapterLoadingStopped":
      if (state.selectedChapterId !== action.nodeId) {
        return state;
      }

      return { ...state, isLoadingChapter: false };
    case "chapterLoaded":
      if (state.selectedChapterId !== action.nodeId) {
        return state;
      }

      return {
        ...state,
        chapterDetail: action.chapter,
        isLoadingChapter: false,
      };
    case "chapterSelected":
      return {
        ...state,
        chapterDetail: null,
        errorMessage: null,
        isLoadingChapter: true,
        isStartingChapter: false,
        selectedChapterId: action.nodeId,
      };
    case "createFinished":
      return {
        ...state,
        isCreating: false,
        isWorkspaceActive: Boolean(state.activeBuild || state.summary),
      };
    case "createStarted":
      return {
        ...state,
        activeBuild: null,
        chapterDetail: null,
        errorMessage: null,
        isCreating: true,
        isLoadingChapter: false,
        isLoadingProject: false,
        isWorkspaceActive: true,
        panelLayout: "both",
        selectedChapterId: null,
        summary: null,
      };
    case "errorChanged":
      return { ...state, errorMessage: action.message };
    case "panelLayoutChanged":
      return { ...state, panelLayout: action.panelLayout };
    case "projectLoadFailed":
      return {
        ...state,
        chapterDetail: null,
        errorMessage: action.message,
        isLoadingChapter: false,
        isLoadingProject: false,
        selectedChapterId: null,
      };
    case "projectLoaded":
      return {
        ...state,
        chapterDetail: action.chapter,
        isLoadingChapter: false,
        isLoadingProject: false,
        selectedChapterId: action.nodeId,
        summary: action.summary,
      };
    case "reset":
      return {
        activeBuild: null,
        chapterDetail: null,
        errorMessage: null,
        isCreating: false,
        isLoadingChapter: false,
        isLoadingProject: false,
        isStartingChapter: false,
        isWorkspaceActive: false,
        panelLayout: "both",
        seedInput: "",
        selectedChapterId: null,
        summary: null,
      };
    case "seedChanged":
      return { ...state, seedInput: action.value };
    case "summaryLoaded":
      return { ...state, summary: action.summary };
  }
}
