import { createRemoteJWKSet, jwtVerify } from "jose";
import { Webhook } from "standardwebhooks";

import { geminiWebhookEventSchema } from "@/lib/content/contracts";

const geminiDynamicWebhookJwks = createRemoteJWKSet(
  new URL("https://generativelanguage.googleapis.com/.well-known/jwks.json"),
);

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

export function verifyDynamicGeminiWebhook(token: string) {
  return jwtVerify(token, geminiDynamicWebhookJwks, {
    algorithms: ["RS256"],
  });
}
