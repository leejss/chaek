import { GenerateBookJob } from "@/lib/ai/jobs/types";
import { serverEnv } from "@/lib/env";
import { Client } from "@upstash/qstash";

const client = new Client({ token: serverEnv.QSTASH_TOKEN });
const sanitizeDeduplicationPart = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]/g, "-");
export async function enqueueGenerateBookJob(job: GenerateBookJob) {
  const baseUrl = serverEnv.QSTASH_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/api/queues/book-generation`;

  const deduplicationId = [
    sanitizeDeduplicationPart(job.bookId),
    sanitizeDeduplicationPart(job.step),
    job.chapterNumber == null ? null : String(job.chapterNumber),
  ]
    .filter((part): part is string => part != null && part.length > 0)
    .join("-");

  console.log("[bookGenerationQueue] enqueued job:", job, deduplicationId);

  await client.publishJSON({
    url,
    body: job,
    deduplicationId,
    retries: 3,
  });
}
