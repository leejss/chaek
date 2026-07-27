import { Webhook } from "standardwebhooks";

import { geminiWebhookEventSchema } from "@/lib/content/contracts";

export function verifyStandardGeminiWebhook(
  rawBody: string,
  headers: Headers,
  signingSecret: string,
) {
  const verified = new Webhook(signingSecret).verify(
    rawBody,
    Object.fromEntries(headers.entries()),
  );

  return geminiWebhookEventSchema.parse(verified);
}
