import "server-only";

import { and, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import {
  applyCompletedAiJob,
  finishProviderAiJob,
  updateNonterminalAiJob,
} from "@/lib/content/build/advance";
import {
  briefGenerationJobInputSchema,
  contentBriefJsonSchema,
  graphPlanJsonSchema,
  graphPlanningJobInputSchema,
} from "@/lib/content/contracts";
import {
  BRIEF_SYSTEM_INSTRUCTION,
  compileBriefInput,
  compileGraphPlanInput,
  GRAPH_PLAN_SYSTEM_INSTRUCTION,
} from "@/lib/content/prompts";
import { getDb } from "@/lib/db";
import { aiJobs, contentBuilds } from "@/lib/db/schema";

import { getGeminiClient } from "./client";
import type { GeminiInteractionSnapshot } from "./results";
import { normalizeGeminiUsage } from "./results";

type CompiledInteraction = {
  systemInstruction: string;
  input: string;
  responseJsonSchema: Record<string, unknown>;
};

function compileInteraction(
  taskType: (typeof aiJobs.$inferSelect)["taskType"],
  rawInput: unknown,
): CompiledInteraction {
  if (taskType === "brief_generation") {
    const input = briefGenerationJobInputSchema.parse(rawInput);

    return {
      systemInstruction: BRIEF_SYSTEM_INSTRUCTION,
      input: compileBriefInput(input),
      responseJsonSchema: contentBriefJsonSchema,
    };
  }

  if (taskType === "graph_planning") {
    const input = graphPlanningJobInputSchema.parse(rawInput);

    return {
      systemInstruction: GRAPH_PLAN_SYSTEM_INSTRUCTION,
      input: compileGraphPlanInput(input),
      responseJsonSchema: graphPlanJsonSchema,
    };
  }

  throw new Error(`Unsupported AI job task type: ${taskType}`);
}

async function markSubmissionFailed(jobId: string) {
  const now = new Date();

  await getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(aiJobs)
      .set({
        status: "failed",
        errorStage: "submission",
        errorCode: "gemini_submission_failed",
        errorMessage: "Gemini interaction submission failed.",
        finishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(aiJobs.id, jobId),
          eq(aiJobs.status, "processing"),
          isNull(aiJobs.geminiInteractionId),
          isNull(aiJobs.resultDisposition),
        ),
      )
      .returning({ buildId: aiJobs.contentBuildId });

    if (!updated?.buildId) {
      return;
    }

    await tx
      .update(contentBuilds)
      .set({
        status: "failed",
        errorCode: "gemini_submission_failed",
        errorMessage: "Gemini interaction submission failed.",
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

async function applyInteractionSnapshot(
  jobId: string,
  interaction: GeminiInteractionSnapshot,
) {
  const usage = normalizeGeminiUsage(interaction.usage);

  switch (interaction.status) {
    case "queued":
    case "in_progress":
      await updateNonterminalAiJob(jobId, "processing", usage);
      return;
    case "requires_action":
      await updateNonterminalAiJob(jobId, "requires_action", usage);
      return;
    case "completed": {
      const application = await applyCompletedAiJob(
        jobId,
        interaction.output_text,
        usage,
      );

      if (application.nextJobId) {
        await submitAiJob(application.nextJobId);
      }

      return;
    }
    case "cancelled":
      await finishProviderAiJob(jobId, "cancelled", usage);
      return;
    case "incomplete":
      await finishProviderAiJob(jobId, "incomplete", usage);
      return;
    case "budget_exceeded":
    case "failed":
      await finishProviderAiJob(jobId, "failed", usage);
      return;
    default:
      await updateNonterminalAiJob(jobId, "processing", usage);
  }
}

export async function submitAiJob(jobId: string) {
  const now = new Date();
  const [job] = await getDb()
    .update(aiJobs)
    .set({
      status: "processing",
      submittedAt: now,
      updatedAt: now,
      errorStage: null,
      errorCode: null,
      errorMessage: null,
    })
    .where(
      and(
        eq(aiJobs.id, jobId),
        eq(aiJobs.status, "queued"),
        isNull(aiJobs.geminiInteractionId),
        isNull(aiJobs.resultDisposition),
      ),
    )
    .returning();

  if (!job) {
    return;
  }

  if (job.contentBuildId) {
    await getDb()
      .update(contentBuilds)
      .set({
        status: "running",
        startedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(contentBuilds.id, job.contentBuildId),
          inArray(contentBuilds.status, ["queued", "waiting_for_user"]),
        ),
      );
  }

  try {
    const compiled = compileInteraction(job.taskType, job.inputJson);
    const interaction = (await getGeminiClient().interactions.create({
      model: job.model,
      background: true,
      store: true,
      system_instruction: compiled.systemInstruction,
      input: compiled.input,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: compiled.responseJsonSchema,
      },
    })) as GeminiInteractionSnapshot;

    await getDb()
      .update(aiJobs)
      .set({
        geminiInteractionId: interaction.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiJobs.id, jobId),
          eq(aiJobs.status, "processing"),
          isNull(aiJobs.geminiInteractionId),
        ),
      );

    await applyInteractionSnapshot(jobId, interaction);
  } catch (error) {
    console.error("[content-compiler] Gemini submission failed.", {
      jobId,
      error: error instanceof Error ? error.name : "UnknownError",
    });

    await markSubmissionFailed(jobId);
  }
}

export async function reconcileAiJob(jobId: string) {
  const [job] = await getDb()
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.id, jobId))
    .limit(1);

  if (
    !job ||
    job.resultDisposition ||
    ["completed", "failed", "cancelled", "incomplete"].includes(job.status)
  ) {
    return;
  }

  if (job.status === "queued") {
    await submitAiJob(job.id);
    return;
  }

  if (!job.geminiInteractionId) {
    await markSubmissionFailed(job.id);
    return;
  }

  try {
    const interaction = (await getGeminiClient().interactions.get(
      job.geminiInteractionId,
    )) as GeminiInteractionSnapshot;

    await applyInteractionSnapshot(job.id, interaction);
  } catch (error) {
    await getDb()
      .update(aiJobs)
      .set({
        errorStage: "result_fetch",
        errorCode: "gemini_result_fetch_failed",
        errorMessage: "Gemini interaction result retrieval failed.",
        lastReconciledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiJobs.id, job.id),
          inArray(aiJobs.status, ["processing", "requires_action"]),
          isNull(aiJobs.resultDisposition),
        ),
      );

    throw error;
  }
}

export async function reconcileContentBuild(buildId: string) {
  const pollBefore = new Date(Date.now() - 5_000);
  const missingMappingBefore = new Date(Date.now() - 120_000);
  const jobs = await getDb()
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.contentBuildId, buildId),
        inArray(aiJobs.status, ["queued", "processing", "requires_action"]),
        isNull(aiJobs.resultDisposition),
        or(
          eq(aiJobs.status, "queued"),
          and(
            isNotNull(aiJobs.geminiInteractionId),
            or(
              isNull(aiJobs.lastReconciledAt),
              lte(aiJobs.lastReconciledAt, pollBefore),
            ),
          ),
          and(
            isNull(aiJobs.geminiInteractionId),
            lte(aiJobs.updatedAt, missingMappingBefore),
          ),
        ),
      ),
    );

  for (const job of jobs) {
    await reconcileAiJob(job.id);
  }
}
