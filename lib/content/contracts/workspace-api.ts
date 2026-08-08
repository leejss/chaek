import type {
  AiJobStatus,
  AiJobTaskType,
  ContentBuildPhase,
  ContentBuildStatus,
} from "@/lib/db/schema/types";

export type ActiveBuild = {
  buildId: string;
  targetNodeId?: string;
  projectId: string;
};

export type BuildJob = {
  id: string;
  status: AiJobStatus;
  taskType: AiJobTaskType;
};

export type BuildStatus = {
  errorCode: string | null;
  id: string;
  phase: ContentBuildPhase;
  progress: {
    briefCompleted: boolean;
    chapterCompleted: boolean;
    graphCompleted: boolean;
    planned: number;
    stale: number;
  };
  projectId: string;
  status: ContentBuildStatus;
  targetNodeId: string | null;
  jobs: BuildJob[];
};

export type CreateProjectResponse = {
  buildId: string;
  projectId: string;
  status: ContentBuildStatus;
};

export type CreateChapterResponse = CreateProjectResponse & {
  nodeId: string;
};
