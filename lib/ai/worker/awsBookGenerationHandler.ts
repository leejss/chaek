import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { bookGenerationStates } from '@/db/schema';
import { bookGenerationJobSchema } from '@/lib/ai/jobs/bookGeneration';
import { runBookGenerationJob } from '@/lib/ai/worker/bookGenerationWorker';

function collectBatchFailures(event: SQSEvent, startIndex: number) {
  return event.Records.slice(startIndex).map((record) => ({
    itemIdentifier: record.messageId
  }));
}

export async function handleBookGenerationSQSEvent(
  event: SQSEvent
): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const [index, record] of event.Records.entries()) {
    let payload: unknown;

    try {
      payload = JSON.parse(record.body);
    } catch {
      console.error('[awsBookGenerationHandler] invalid JSON message:', record.messageId);
      batchItemFailures.push(...collectBatchFailures(event, index));
      break;
    }

    const parsed = bookGenerationJobSchema.safeParse(payload);
    if (!parsed.success) {
      console.error('[awsBookGenerationHandler] invalid job payload:', record.messageId);
      batchItemFailures.push(...collectBatchFailures(event, index));
      break;
    }

    const job = parsed.data;

    try {
      await runBookGenerationJob(job);
    } catch (error) {
      console.error('[awsBookGenerationHandler] worker error:', error);

      await db
        .update(bookGenerationStates)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Worker error',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(bookGenerationStates.bookId, job.bookId),
            eq(bookGenerationStates.generationVersion, job.generationVersion)
          )
        );

      batchItemFailures.push(...collectBatchFailures(event, index));
      break;
    }
  }

  return { batchItemFailures };
}
