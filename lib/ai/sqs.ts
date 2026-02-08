import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { BookGenerationJob } from "@/lib/ai/jobs/bookGeneration";
import { serverEnv } from "@/lib/env";

const sqsClient = new SQSClient({
  region: serverEnv.AWS_REGION,
});

export async function enqueueBookGenerationJob(job: BookGenerationJob) {
  const dedupKey = `book:${job.bookId}:v${job.generationVersion}:${job.trigger}`;

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: serverEnv.AWS_SQS_BOOK_GENERATION_QUEUE_URL,
      MessageBody: JSON.stringify(job),
      MessageGroupId: job.bookId,
      MessageDeduplicationId: dedupKey,
    }),
  );
}
