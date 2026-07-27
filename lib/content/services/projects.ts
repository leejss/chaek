import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  aiJobs,
  contentBuilds,
  contentEdges,
  contentNodes,
  contentProjects,
} from "@/lib/db/schema";

import {
  ContentBuildNotFoundError,
  ContentProjectNotFoundError,
} from "../errors";

export async function getOwnedContentProject(
  userId: string,
  projectId: string,
) {
  const [project] = await getDb()
    .select()
    .from(contentProjects)
    .where(
      and(
        eq(contentProjects.id, projectId),
        eq(contentProjects.userId, userId),
      ),
    )
    .limit(1);

  if (!project) {
    throw new ContentProjectNotFoundError();
  }

  return project;
}

export async function getOwnedContentBuild(
  userId: string,
  projectId: string,
  buildId: string,
) {
  const [record] = await getDb()
    .select({
      build: contentBuilds,
      projectStatus: contentProjects.status,
    })
    .from(contentBuilds)
    .innerJoin(contentProjects, eq(contentBuilds.projectId, contentProjects.id))
    .where(
      and(
        eq(contentBuilds.id, buildId),
        eq(contentBuilds.projectId, projectId),
        eq(contentProjects.userId, userId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new ContentBuildNotFoundError();
  }

  return record;
}

export async function getContentProjectSummary(
  userId: string,
  projectId: string,
) {
  const project = await getOwnedContentProject(userId, projectId);
  const db = getDb();
  const [latestBuild, nodes] = await Promise.all([
    db
      .select()
      .from(contentBuilds)
      .where(eq(contentBuilds.projectId, projectId))
      .orderBy(desc(contentBuilds.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(contentNodes)
      .where(eq(contentNodes.projectId, projectId))
      .orderBy(asc(contentNodes.position), asc(contentNodes.createdAt)),
  ]);

  const parts = nodes
    .filter((node) => node.kind === "part")
    .sort(
      (left, right) =>
        (left.position ?? Number.MAX_SAFE_INTEGER) -
          (right.position ?? Number.MAX_SAFE_INTEGER) ||
        left.title.localeCompare(right.title),
    )
    .map((part) => ({
      id: part.id,
      slug: part.slug,
      title: part.title,
      position: part.position,
      chapters: nodes
        .filter((node) => node.kind === "chapter" && node.parentId === part.id)
        .sort(
          (left, right) =>
            (left.position ?? Number.MAX_SAFE_INTEGER) -
              (right.position ?? Number.MAX_SAFE_INTEGER) ||
            left.title.localeCompare(right.title),
        )
        .map((chapter) => ({
          id: chapter.id,
          slug: chapter.slug,
          title: chapter.title,
          position: chapter.position,
          editorialStatus: chapter.editorialStatus,
          freshness: chapter.freshness,
          contract: chapter.contractJson,
        })),
    }));

  return {
    project,
    latestBuild,
    outline: {
      parts,
      conceptCount: nodes.filter((node) => node.kind === "concept").length,
      exampleCount: nodes.filter((node) => node.kind === "example").length,
    },
  };
}

export async function getContentGraph(userId: string, projectId: string) {
  const project = await getOwnedContentProject(userId, projectId);
  const db = getDb();
  const [nodes, edges] = await Promise.all([
    db
      .select()
      .from(contentNodes)
      .where(eq(contentNodes.projectId, projectId))
      .orderBy(asc(contentNodes.kind), asc(contentNodes.position)),
    db
      .select()
      .from(contentEdges)
      .where(eq(contentEdges.projectId, projectId))
      .orderBy(asc(contentEdges.type), asc(contentEdges.createdAt)),
  ]);

  return { project, nodes, edges };
}

export async function getContentBuildStatus(
  userId: string,
  projectId: string,
  buildId: string,
) {
  const { build, projectStatus } = await getOwnedContentBuild(
    userId,
    projectId,
    buildId,
  );
  const db = getDb();
  const [jobs, nodes] = await Promise.all([
    db
      .select({
        id: aiJobs.id,
        taskType: aiJobs.taskType,
        status: aiJobs.status,
        resultDisposition: aiJobs.resultDisposition,
        attemptNumber: aiJobs.attemptNumber,
        errorCode: aiJobs.errorCode,
        createdAt: aiJobs.createdAt,
        finishedAt: aiJobs.finishedAt,
      })
      .from(aiJobs)
      .where(eq(aiJobs.contentBuildId, buildId))
      .orderBy(asc(aiJobs.createdAt)),
    db
      .select({
        kind: contentNodes.kind,
        freshness: contentNodes.freshness,
      })
      .from(contentNodes)
      .where(eq(contentNodes.projectId, projectId)),
  ]);

  const briefJob = jobs.find((job) => job.taskType === "brief_generation");
  const graphJob = jobs.find((job) => job.taskType === "graph_planning");

  return {
    id: build.id,
    projectId,
    projectStatus,
    phase: build.phase,
    status: build.status,
    errorCode: build.errorCode,
    createdAt: build.createdAt,
    startedAt: build.startedAt,
    finishedAt: build.finishedAt,
    progress: {
      briefCompleted:
        briefJob?.status === "completed" &&
        briefJob.resultDisposition === "applied",
      graphCompleted:
        graphJob?.status === "completed" &&
        graphJob.resultDisposition === "applied",
      planned: nodes.filter((node) => node.kind === "chapter").length,
      stale: nodes.filter((node) => node.freshness === "stale").length,
    },
    jobs,
  };
}
