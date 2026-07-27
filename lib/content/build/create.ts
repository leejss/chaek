import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { BriefGenerationJobInput } from "@/lib/content/contracts";
import { BRIEF_PROMPT_VERSION } from "@/lib/content/prompts";
import { getDb } from "@/lib/db";
import {
  type AiJobInput,
  aiJobs,
  contentBuilds,
  contentProjects,
} from "@/lib/db/schema";

type InitialBuildRecords = {
  projectId: string;
  buildId: string;
  initialJobId: string;
  status: (typeof contentBuilds.$inferSelect)["status"];
};

async function findExistingInitialBuild(
  userId: string,
  idempotencyKey: string,
): Promise<InitialBuildRecords | null> {
  const db = getDb();
  const [project] = await db
    .select({ id: contentProjects.id })
    .from(contentProjects)
    .where(
      and(
        eq(contentProjects.userId, userId),
        eq(contentProjects.creationIdempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (!project) {
    return null;
  }

  const [build] = await db
    .select()
    .from(contentBuilds)
    .where(
      and(
        eq(contentBuilds.projectId, project.id),
        eq(contentBuilds.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (!build) {
    return null;
  }

  const [job] = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.contentBuildId, build.id),
        eq(aiJobs.taskType, "brief_generation"),
      ),
    )
    .orderBy(asc(aiJobs.createdAt))
    .limit(1);

  if (!job) {
    return null;
  }

  return {
    projectId: project.id,
    buildId: build.id,
    initialJobId: job.id,
    status: build.status,
  };
}

async function createInitialBuildRecords(
  userId: string,
  seedInput: string,
  idempotencyKey: string,
): Promise<InitialBuildRecords> {
  const existing = await findExistingInitialBuild(userId, idempotencyKey);

  if (existing) {
    return existing;
  }

  const projectId = crypto.randomUUID();
  const buildId = crypto.randomUUID();
  const initialJobId = crypto.randomUUID();
  const jobInput: BriefGenerationJobInput = {
    promptVersion: BRIEF_PROMPT_VERSION,
    payloadVersion: 1,
    seedInput,
  };

  try {
    await getDb().transaction(async (tx) => {
      await tx.insert(contentProjects).values({
        id: projectId,
        userId,
        creationIdempotencyKey: idempotencyKey,
        title: seedInput.slice(0, 240),
        seedInput,
        status: "planning",
        graphVersion: 0,
      });

      await tx.insert(contentBuilds).values({
        id: buildId,
        projectId,
        requestedByUserId: userId,
        idempotencyKey,
        scopeType: "project",
        baseGraphVersion: 0,
        phase: "interpreting",
        status: "queued",
      });

      await tx.insert(aiJobs).values({
        id: initialJobId,
        userId,
        contentProjectId: projectId,
        contentBuildId: buildId,
        idempotencyKey: `${buildId}:brief_generation:project:0:1`,
        taskType: "brief_generation",
        payloadVersion: 1,
        status: "queued",
        inputJson: jobInput as unknown as AiJobInput,
        baseGraphVersion: 0,
        attemptNumber: 1,
      });
    });
  } catch (error) {
    const raced = await findExistingInitialBuild(userId, idempotencyKey);

    if (raced) {
      return raced;
    }

    throw error;
  }

  return {
    projectId,
    buildId,
    initialJobId,
    status: "queued",
  };
}

export async function startContentProject(
  userId: string,
  seedInput: string,
  idempotencyKey: string,
) {
  const records = await createInitialBuildRecords(
    userId,
    seedInput,
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
    buildId: records.buildId,
    status: build?.status ?? records.status,
  };
}
