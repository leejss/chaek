import { GenerateBookJob } from "@/lib/ai/jobs/types";
import { serverEnv } from "@/lib/env";
import { Client } from "@upstash/qstash";

const client = new Client({ token: serverEnv.QSTASH_TOKEN });

export async function enqueueGenerateBookJob(job: GenerateBookJob) {
  const url = `${serverEnv.QSTASH_BASE_URL}/api/queues/book-generation`;
  const deduplicationId = `${job.bookId}:${job.step}:${
    job.chapterNumber ?? ""
  }`;

  await client.publishJSON({
    url,
    body: job,
    deduplicationId,
    retries: 5,
  });
}
