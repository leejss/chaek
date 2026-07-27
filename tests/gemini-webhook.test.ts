import assert from "node:assert/strict";
import test from "node:test";

import { Webhook, WebhookVerificationError } from "standardwebhooks";

import { verifyStandardGeminiWebhook } from "../lib/ai/gemini/webhook-verification";

const signingSecret = "whsec_dGVzdC13ZWJob29rLXNlY3JldA==";

function createSignedWebhook() {
  const webhookId = "webhook-test-1";
  const timestamp = new Date();
  const payload = JSON.stringify({
    type: "interaction.completed",
    version: "v1",
    timestamp: timestamp.toISOString(),
    data: {
      id: "interaction-test-1",
    },
  });
  const signature = new Webhook(signingSecret).sign(
    webhookId,
    timestamp,
    payload,
  );
  const headers = new Headers({
    "webhook-id": webhookId,
    "webhook-signature": signature,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1_000)),
  });

  return { headers, payload };
}

test("a valid Standard Webhook signature returns the normalized event", () => {
  const { headers, payload } = createSignedWebhook();
  const event = verifyStandardGeminiWebhook(payload, headers, signingSecret);

  assert.equal(event.type, "interaction.completed");
  assert.equal(event.data.id, "interaction-test-1");
});

test("a mutated raw body is rejected", () => {
  const { headers, payload } = createSignedWebhook();

  assert.throws(
    () =>
      verifyStandardGeminiWebhook(
        payload.replace("completed", "failed"),
        headers,
        signingSecret,
      ),
    WebhookVerificationError,
  );
});
