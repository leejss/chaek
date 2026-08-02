import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

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

export type ContentProjectNavigationSection = "today" | "week" | "older";

export type ContentProjectNavigationItem = {
  buildId: string | null;
  buildStatus: (typeof contentBuilds.$inferSelect)["status"] | null;
  id: string;
  section: ContentProjectNavigationSection;
  status: (typeof contentProjects.$inferSelect)["status"];
  title: string;
  updatedAt: string;
};

function getNavigationSection(
  updatedAt: Date,
  now: Date,
): ContentProjectNavigationSection {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7));

  if (updatedAt >= todayStart) {
    return "today";
  }

  if (updatedAt >= weekStart) {
    return "week";
  }

  return "older";
}

export async function getContentProjectNavigation(userId: string) {
  const db = getDb();
  const projects = await db
    .select({
      createdAt: contentProjects.createdAt,
      id: contentProjects.id,
      status: contentProjects.status,
      title: contentProjects.title,
      updatedAt: contentProjects.updatedAt,
    })
    .from(contentProjects)
    .where(eq(contentProjects.userId, userId))
    .orderBy(desc(contentProjects.updatedAt), desc(contentProjects.createdAt))
    .limit(50);

  if (!projects.length) {
    return [] satisfies ContentProjectNavigationItem[];
  }

  const builds = await db
    .select({
      id: contentBuilds.id,
      projectId: contentBuilds.projectId,
      status: contentBuilds.status,
      createdAt: contentBuilds.createdAt,
    })
    .from(contentBuilds)
    .where(
      inArray(
        contentBuilds.projectId,
        projects.map((project) => project.id),
      ),
    )
    .orderBy(desc(contentBuilds.createdAt));

  const latestBuildByProjectId = new Map<
    string,
    (typeof builds)[number]
  >();

  for (const build of builds) {
    if (!latestBuildByProjectId.has(build.projectId)) {
      latestBuildByProjectId.set(build.projectId, build);
    }
  }

  const now = new Date();

  return projects.map((project) => {
    const latestBuild = latestBuildByProjectId.get(project.id);

    return {
      buildId: latestBuild?.id ?? null,
      buildStatus: latestBuild?.status ?? null,
      id: project.id,
      section: getNavigationSection(project.updatedAt, now),
      status: project.status,
      title: project.title,
      updatedAt: project.updatedAt.toISOString(),
    } satisfies ContentProjectNavigationItem;
  });
}

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
          hasContent: chapter.contentJson !== null,
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
        targetNodeId: aiJobs.targetNodeId,
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
  const chapterJob = jobs.find((job) => job.taskType === "node_drafting");

  return {
    id: build.id,
    projectId,
    projectStatus,
    phase: build.phase,
    targetNodeId: build.scopeNodeId,
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
      chapterCompleted:
        chapterJob?.status === "completed" &&
        chapterJob.resultDisposition === "applied",
      planned: nodes.filter((node) => node.kind === "chapter").length,
      stale: nodes.filter((node) => node.freshness === "stale").length,
    },
    jobs,
  };
}
