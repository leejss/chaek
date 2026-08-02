import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { AiJobInput } from "@/lib/db/schema";
import {
  aiJobs,
  contentBuilds,
  contentProjects,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db";

import { ContentBuildConflictError } from "../errors";
import { compileChapterDraftingContext } from "../services/chapter-context";

type ChapterBuildRecords = {
  buildId: string;
  initialJobId: string;
  nodeId: string;
  projectId: string;
  status: (typeof contentBuilds.$inferSelect)["status"];
};

async function findExistingChapterBuild(
  userId: string,
  projectId: string,
  nodeId: string,
  idempotencyKey: string,
): Promise<ChapterBuildRecords | null> {
  const db = getDb();
  const [record] = await db
    .select({ build: contentBuilds })
    .from(contentBuilds)
    .innerJoin(contentProjects, eq(contentBuilds.projectId, contentProjects.id))
    .where(
      and(
        eq(contentBuilds.projectId, projectId),
        eq(contentBuilds.idempotencyKey, idempotencyKey),
        eq(contentProjects.userId, userId),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  if (
    record.build.scopeType !== "chapter" ||
    record.build.scopeNodeId !== nodeId
  ) {
    throw new ContentBuildConflictError();
  }

  const [job] = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.contentBuildId, record.build.id),
        eq(aiJobs.targetNodeId, nodeId),
        eq(aiJobs.taskType, "node_drafting"),
      ),
    )
    .orderBy(asc(aiJobs.createdAt))
    .limit(1);

  if (!job) {
    return null;
  }

  return {
    buildId: record.build.id,
    initialJobId: job.id,
    nodeId,
    projectId,
    status: record.build.status,
  };
}

async function createChapterBuildRecords(
  userId: string,
  projectId: string,
  nodeId: string,
  idempotencyKey: string,
): Promise<ChapterBuildRecords> {
  const existing = await findExistingChapterBuild(
    userId,
    projectId,
    nodeId,
    idempotencyKey,
  );

  if (existing) {
    return existing;
  }

  const input = await compileChapterDraftingContext(
    userId,
    projectId,
    nodeId,
  );
  const buildId = crypto.randomUUID();
  const initialJobId = crypto.randomUUID();

  try {
    await getDb().transaction(async (tx) => {
      await tx.insert(contentBuilds).values({
        id: buildId,
        projectId,
        requestedByUserId: userId,
        idempotencyKey,
        scopeType: "chapter",
        scopeNodeId: nodeId,
        baseGraphVersion: input.baseGraphVersion,
        phase: "drafting",
        status: "queued",
      });

      await tx.insert(aiJobs).values({
        id: initialJobId,
        userId,
        contentProjectId: projectId,
        contentBuildId: buildId,
        targetNodeId: nodeId,
        idempotencyKey: `${buildId}:node_drafting:${nodeId}:${input.baseGraphVersion}:1`,
        taskType: "node_drafting",
        payloadVersion: 1,
        status: "queued",
        inputJson: input as unknown as AiJobInput,
        baseGraphVersion: input.baseGraphVersion,
        attemptNumber: 1,
      });
    });
  } catch (error) {
    const raced = await findExistingChapterBuild(
      userId,
      projectId,
      nodeId,
      idempotencyKey,
    );

    if (raced) {
      return raced;
    }

    throw error;
  }

  return {
    buildId,
    initialJobId,
    nodeId,
    projectId,
    status: "queued",
  };
}

export async function startChapterBuild(
  userId: string,
  projectId: string,
  nodeId: string,
  idempotencyKey: string,
) {
  const records = await createChapterBuildRecords(
    userId,
    projectId,
    nodeId,
    idempotencyKey,
  );
  const { submitAiJob } = await import("@/lib/ai/gemini/interactions");

  await submitAiJob(records.initialJobId);

  const [build] = await getDb()
    .select({ status: contentBuilds.status })
    .from(contentBuilds)
    .where(eq(contentBuilds.id, records.buildId))
    .limit(1);

  return {
    projectId: records.projectId,
    nodeId: records.nodeId,
    buildId: records.buildId,
    status: build?.status ?? records.status,
  };
}
