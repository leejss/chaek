import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookGenerationStates } from "@/db/schema";
import { bookGenerationJobSchema } from "@/lib/ai/jobs/bookGeneration";
import { runBookGenerationJob } from "@/lib/ai/worker/bookGenerationWorker";

interface SQSEventRecord {
  messageId: string;
  body: string;
}

interface SQSEventLike {
  Records: SQSEventRecord[];
}

interface BatchItemFailure {
  itemIdentifier: string;
}

interface SQSBatchResponse {
  batchItemFailures: BatchItemFailure[];
}

export async function handleBookGenerationSQSEvent(event: SQSEventLike): Promise<SQSBatchResponse> {
  const batchItemFailures: BatchItemFailure[] = [];

  for (const record of event.Records) {
    let payload: unknown;

    try {
      payload = JSON.parse(record.body);
    } catch {
      console.error("[awsBookGenerationHandler] invalid JSON message:", record.messageId);
      continue;
    }

    const parsed = bookGenerationJobSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("[awsBookGenerationHandler] invalid job payload:", record.messageId);
      continue;
    }

    const job = parsed.data;

    try {
      await runBookGenerationJob(job);
    } catch (error) {
      console.error("[awsBookGenerationHandler] worker error:", error);

      await db
        .update(bookGenerationStates)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : "Worker error",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookGenerationStates.bookId, job.bookId),
            eq(bookGenerationStates.generationVersion, job.generationVersion),
          ),
        );

      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
