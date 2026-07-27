import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  briefGenerationJobInputSchema,
  contentBriefResultSchema,
  type GraphPlanResult,
  graphPlanningJobInputSchema,
  graphPlanResultSchema,
} from "@/lib/content/contracts";
import { validateGraphPlan } from "@/lib/content/graph";
import { GRAPH_PLAN_PROMPT_VERSION } from "@/lib/content/prompts";
import { getDb } from "@/lib/db";
import {
  type AiJobInput,
  type AiJobResult,
  type AiJobStatus,
  type AiJobUsage,
  aiJobs,
  contentBuilds,
  contentEdges,
  contentNodes,
  contentProjects,
  type JsonObject,
} from "@/lib/db/schema";

type CompletedJobApplication = {
  nextJobId?: string;
};

function createUniqueSlug(
  kind: "part" | "chapter" | "concept" | "example",
  nodeRef: string,
  usedSlugs: Set<string>,
) {
  const base =
    `${kind}-${nodeRef}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || `${kind}-node`;
  let slug = base;
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(slug);
  return slug;
}

function compileGraphRecords(projectId: string, plan: GraphPlanResult) {
  const nodeIdsByRef = new Map<string, string>();
  const usedSlugs = new Set<string>();

  for (const node of [
    ...plan.parts,
    ...plan.chapters,
    ...plan.concepts,
    ...plan.examples,
  ]) {
    nodeIdsByRef.set(node.ref, crypto.randomUUID());
  }

  const partRecords = plan.parts.map((part) => ({
    id: nodeIdsByRef.get(part.ref) as string,
    projectId,
    parentId: null,
    kind: "part" as const,
    slug: createUniqueSlug("part", part.ref, usedSlugs),
    title: part.title,
    position: part.position,
    contractJson: {
      purpose: part.purpose,
    } satisfies JsonObject,
  }));

  const chapterRecords = plan.chapters.map((chapter) => ({
    id: nodeIdsByRef.get(chapter.ref) as string,
    projectId,
    parentId: nodeIdsByRef.get(chapter.partRef) as string,
    kind: "chapter" as const,
    slug: createUniqueSlug("chapter", chapter.ref, usedSlugs),
    title: chapter.title,
    position: chapter.position,
    contractJson: {
      purpose: chapter.purpose,
      readerStateBefore: chapter.readerStateBefore,
      readerStateAfter: chapter.readerStateAfter,
      mustCover: chapter.mustCover,
      mustNotCover: chapter.mustNotCover,
    } satisfies JsonObject,
  }));

  const conceptRecords = plan.concepts.map((concept) => ({
    id: nodeIdsByRef.get(concept.ref) as string,
    projectId,
    parentId: null,
    kind: "concept" as const,
    slug: createUniqueSlug("concept", concept.ref, usedSlugs),
    title: concept.name,
    position: null,
    contractJson: {
      canonicalDefinition: concept.canonicalDefinition,
    } satisfies JsonObject,
  }));

  const exampleRecords = plan.examples.map((example) => ({
    id: nodeIdsByRef.get(example.ref) as string,
    projectId,
    parentId: null,
    kind: "example" as const,
    slug: createUniqueSlug("example", example.ref, usedSlugs),
    title: example.name,
    position: null,
    contractJson: {
      completionState: example.completionState,
    } satisfies JsonObject,
  }));

  const edgeRecords = plan.edges.map((edge) => ({
    id: crypto.randomUUID(),
    projectId,
    fromNodeId: nodeIdsByRef.get(edge.fromRef) as string,
    toNodeId: nodeIdsByRef.get(edge.toRef) as string,
    type: edge.type,
  }));

  return {
    partRecords,
    chapterRecords,
    conceptRecords,
    exampleRecords,
    edgeRecords,
  };
}

async function rejectCompletedJob(
  jobId: string,
  errorCode: string,
  errorMessage: string,
  resultJson?: AiJobResult,
) {
  const now = new Date();

  await getDb().transaction(async (tx) => {
    const [claimed] = await tx
      .update(aiJobs)
      .set({
        status: "completed",
        resultJson,
        resultDisposition: "rejected",
        errorStage: "internal",
        errorCode,
        errorMessage,
        finishedAt: now,
        updatedAt: now,
      })
      .where(and(eq(aiJobs.id, jobId), isNull(aiJobs.resultDisposition)))
      .returning({ buildId: aiJobs.contentBuildId });

    if (!claimed?.buildId) {
      return;
    }

    await tx
      .update(contentBuilds)
      .set({
        status: "failed",
        errorCode,
        errorMessage,
        finishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(contentBuilds.id, claimed.buildId),
          inArray(contentBuilds.status, [
            "queued",
            "running",
            "waiting_for_user",
            "partially_completed",
          ]),
        ),
      );
  });
}

async function applyBriefResult(
  jobId: string,
  rawInput: unknown,
  outputText: string,
  usage: AiJobUsage | undefined,
): Promise<CompletedJobApplication> {
  const input = briefGenerationJobInputSchema.safeParse(rawInput);
  const parsedJson = (() => {
    try {
      return JSON.parse(outputText) as unknown;
    } catch {
      return null;
    }
  })();
  const result = contentBriefResultSchema.safeParse(parsedJson);

  if (!input.success || !result.success) {
    await rejectCompletedJob(
      jobId,
      "invalid_structured_output",
      "The brief result did not match contract version 1.",
      parsedJson && typeof parsedJson === "object"
        ? (parsedJson as AiJobResult)
        : undefined,
    );
    return {};
  }

  const now = new Date();
  const nextJobId = crypto.randomUUID();
  let createdNextJob = false;

  await getDb().transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(aiJobs)
      .where(eq(aiJobs.id, jobId))
      .limit(1);

    if (
      !job?.contentProjectId ||
      !job.contentBuildId ||
      job.resultDisposition
    ) {
      return;
    }

    const [project] = await tx
      .select()
      .from(contentProjects)
      .where(eq(contentProjects.id, job.contentProjectId))
      .limit(1);

    if (!project) {
      return;
    }

    const [claimed] = await tx
      .update(aiJobs)
      .set({
        status: "completed",
        resultJson: result.data as unknown as AiJobResult,
        usageJson: usage,
        resultDisposition: "applied",
        appliedAt: now,
        finishedAt: now,
        updatedAt: now,
        errorStage: null,
        errorCode: null,
        errorMessage: null,
      })
      .where(and(eq(aiJobs.id, jobId), isNull(aiJobs.resultDisposition)))
      .returning({ id: aiJobs.id });

    if (!claimed) {
      return;
    }

    await tx
      .update(contentProjects)
      .set({
        title: result.data.title,
        briefJson: result.data,
        updatedAt: now,
      })
      .where(eq(contentProjects.id, project.id));

    const graphInput = {
      promptVersion: GRAPH_PLAN_PROMPT_VERSION,
      payloadVersion: 1,
      baseGraphVersion: project.graphVersion,
      seedInput: project.seedInput,
      brief: result.data,
    } as const;

    await tx.insert(aiJobs).values({
      id: nextJobId,
      userId: job.userId,
      contentProjectId: project.id,
      contentBuildId: job.contentBuildId,
      idempotencyKey: `${job.contentBuildId}:graph_planning:project:${project.graphVersion}:1`,
      taskType: "graph_planning",
      payloadVersion: 1,
      status: "queued",
      inputJson: graphInput as unknown as AiJobInput,
      baseGraphVersion: project.graphVersion,
      attemptNumber: 1,
    });

    await tx
      .update(contentBuilds)
      .set({
        status: "running",
        phase: "planning",
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(contentBuilds.id, job.contentBuildId));

    createdNextJob = true;
  });

  return createdNextJob ? { nextJobId } : {};
}

async function markGraphConflict(jobId: string, usage?: AiJobUsage) {
  const now = new Date();

  await getDb().transaction(async (tx) => {
    const [claimed] = await tx
      .update(aiJobs)
      .set({
        status: "completed",
        usageJson: usage,
        resultDisposition: "conflicted",
        errorStage: "internal",
        errorCode: "graph_version_conflict",
        errorMessage:
          "The project graph changed before the planning result was applied.",
        finishedAt: now,
        updatedAt: now,
      })
      .where(and(eq(aiJobs.id, jobId), isNull(aiJobs.resultDisposition)))
      .returning({ buildId: aiJobs.contentBuildId });

    if (!claimed?.buildId) {
      return;
    }

    await tx
      .update(contentBuilds)
      .set({
        status: "failed",
        errorCode: "graph_version_conflict",
        errorMessage:
          "The project graph changed before the planning result was applied.",
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(contentBuilds.id, claimed.buildId));
  });
}

async function applyGraphResult(
  jobId: string,
  rawInput: unknown,
  outputText: string,
  usage: AiJobUsage | undefined,
): Promise<CompletedJobApplication> {
  const input = graphPlanningJobInputSchema.safeParse(rawInput);
  const parsedJson = (() => {
    try {
      return JSON.parse(outputText) as unknown;
    } catch {
      return null;
    }
  })();
  const result = graphPlanResultSchema.safeParse(parsedJson);

  if (!input.success || !result.success) {
    await rejectCompletedJob(
      jobId,
      "invalid_structured_output",
      "The graph plan did not match contract version 1.",
      parsedJson && typeof parsedJson === "object"
        ? (parsedJson as AiJobResult)
        : undefined,
    );
    return {};
  }

  if (result.data.baseGraphVersion !== input.data.baseGraphVersion) {
    await rejectCompletedJob(
      jobId,
      "base_graph_version_mismatch",
      "The graph plan returned an unexpected base graph version.",
      result.data as unknown as AiJobResult,
    );
    return {};
  }

  const validation = validateGraphPlan(result.data);

  if (!validation.valid) {
    await rejectCompletedJob(
      jobId,
      "invalid_content_graph",
      JSON.stringify(validation.issues),
      result.data as unknown as AiJobResult,
    );
    return {};
  }

  const [job] = await getDb()
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.id, jobId))
    .limit(1);

  if (!job?.contentProjectId || !job.contentBuildId) {
    await rejectCompletedJob(
      jobId,
      "missing_content_context",
      "The graph planning job is not connected to a project and build.",
    );
    return {};
  }

  const [project] = await getDb()
    .select()
    .from(contentProjects)
    .where(eq(contentProjects.id, job.contentProjectId))
    .limit(1);

  if (!project || project.graphVersion !== result.data.baseGraphVersion) {
    await markGraphConflict(jobId, usage);
    return {};
  }

  const records = compileGraphRecords(project.id, result.data);
  const nextGraphVersion = project.graphVersion + 1;
  const now = new Date();
  let graphApplied = false;
  let graphConflicted = false;

  await getDb().transaction(async (tx) => {
    const [currentProject] = await tx
      .select({
        graphVersion: contentProjects.graphVersion,
      })
      .from(contentProjects)
      .where(eq(contentProjects.id, project.id))
      .limit(1);

    if (currentProject?.graphVersion !== result.data.baseGraphVersion) {
      graphConflicted = true;
      return;
    }

    const [claimed] = await tx
      .update(aiJobs)
      .set({
        status: "completed",
        resultJson: result.data as unknown as AiJobResult,
        usageJson: usage,
        resultDisposition: "applied",
        appliedAt: now,
        finishedAt: now,
        updatedAt: now,
        errorStage: null,
        errorCode: null,
        errorMessage: null,
      })
      .where(and(eq(aiJobs.id, jobId), isNull(aiJobs.resultDisposition)))
      .returning({ id: aiJobs.id });

    if (!claimed) {
      return;
    }

    if (records.partRecords.length > 0) {
      await tx.insert(contentNodes).values(records.partRecords);
    }

    if (records.chapterRecords.length > 0) {
      await tx.insert(contentNodes).values(records.chapterRecords);
    }

    if (records.conceptRecords.length > 0) {
      await tx.insert(contentNodes).values(records.conceptRecords);
    }

    if (records.exampleRecords.length > 0) {
      await tx.insert(contentNodes).values(records.exampleRecords);
    }

    if (records.edgeRecords.length > 0) {
      await tx.insert(contentEdges).values(records.edgeRecords);
    }

    await tx
      .update(contentProjects)
      .set({
        graphVersion: nextGraphVersion,
        status: "drafting",
        updatedAt: now,
      })
      .where(
        and(
          eq(contentProjects.id, project.id),
          eq(contentProjects.graphVersion, result.data.baseGraphVersion),
        ),
      );

    await tx
      .update(contentBuilds)
      .set({
        phase: "finalizing",
        status: "completed",
        resultGraphVersion: nextGraphVersion,
        finishedAt: now,
        updatedAt: now,
        errorCode: null,
        errorMessage: null,
      })
      .where(eq(contentBuilds.id, job.contentBuildId as string));

    graphApplied = true;
  });

  if (!graphApplied && graphConflicted) {
    await markGraphConflict(jobId, usage);
  }

  return {};
}

export async function applyCompletedAiJob(
  jobId: string,
  outputText: string | undefined,
  usage: AiJobUsage | undefined,
): Promise<CompletedJobApplication> {
  const [job] = await getDb()
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.id, jobId))
    .limit(1);

  if (!job || job.resultDisposition) {
    return {};
  }

  if (!outputText) {
    await rejectCompletedJob(
      jobId,
      "missing_output_text",
      "Gemini completed without structured output text.",
    );
    return {};
  }

  switch (job.taskType) {
    case "brief_generation":
      return applyBriefResult(jobId, job.inputJson, outputText, usage);
    case "graph_planning":
      return applyGraphResult(jobId, job.inputJson, outputText, usage);
    default:
      await rejectCompletedJob(
        jobId,
        "unsupported_task_type",
        `Task type "${job.taskType}" is not supported by this vertical slice.`,
      );
      return {};
  }
}

export async function updateNonterminalAiJob(
  jobId: string,
  status: Extract<AiJobStatus, "processing" | "requires_action">,
  usage?: AiJobUsage,
) {
  const now = new Date();
  const [updated] = await getDb()
    .update(aiJobs)
    .set({
      status,
      usageJson: usage,
      lastReconciledAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(aiJobs.id, jobId),
        isNull(aiJobs.resultDisposition),
        inArray(aiJobs.status, ["queued", "processing", "requires_action"]),
      ),
    )
    .returning({ buildId: aiJobs.contentBuildId });

  if (status === "requires_action" && updated?.buildId) {
    await getDb()
      .update(contentBuilds)
      .set({
        status: "waiting_for_user",
        updatedAt: now,
      })
      .where(eq(contentBuilds.id, updated.buildId));
  }
}

export async function finishProviderAiJob(
  jobId: string,
  status: Extract<AiJobStatus, "failed" | "cancelled" | "incomplete">,
  usage?: AiJobUsage,
) {
  const now = new Date();

  await getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(aiJobs)
      .set({
        status,
        usageJson: usage,
        errorStage: "execution",
        errorCode: `gemini_${status}`,
        errorMessage: `Gemini interaction finished with status "${status}".`,
        finishedAt: now,
        lastReconciledAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(aiJobs.id, jobId),
          isNull(aiJobs.resultDisposition),
          inArray(aiJobs.status, ["queued", "processing", "requires_action"]),
        ),
      )
      .returning({ buildId: aiJobs.contentBuildId });

    if (!updated?.buildId) {
      return;
    }

    await tx
      .update(contentBuilds)
      .set({
        status: status === "cancelled" ? "cancelled" : "failed",
        errorCode: `gemini_${status}`,
        errorMessage: `Gemini interaction finished with status "${status}".`,
        finishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(contentBuilds.id, updated.buildId),
          inArray(contentBuilds.status, [
            "queued",
            "running",
            "waiting_for_user",
            "partially_completed",
          ]),
        ),
      );
  });
}
