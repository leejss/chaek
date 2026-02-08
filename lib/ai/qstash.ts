import { Client } from "@upstash/qstash";
import type { BookGenerationJob } from "@/lib/ai/jobs/bookGeneration";
import { serverEnv } from "@/lib/env";

const client = new Client({ token: serverEnv.QSTASH_TOKEN });

function getBaseUrl() {
  return serverEnv.QSTASH_BASE_URL.replace(/\/$/, "");
}

export async function enqueueBookGenerationJob(job: BookGenerationJob) {
  const destination = `${getBaseUrl()}/api/jobs/book-generation`;
  const deduplicationId = `book:${job.bookId}:v${job.generationVersion}:${job.trigger}`;

  await client.publishJSON({
    url: destination,
    body: job,
    retries: 3,
    deduplicationId,
  });
}
