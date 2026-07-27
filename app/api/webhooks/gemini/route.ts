import { after } from "next/server";
import { WebhookVerificationError } from "standardwebhooks";

import {
  processWebhookEvent,
  receiveGeminiWebhook,
  verifyGeminiWebhook,
} from "@/lib/ai/gemini";
import { verifyDynamicGeminiWebhook } from "@/lib/ai/gemini/webhook-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("webhook-signature");

  if (signature?.split(".").length === 3) {
    try {
      const { payload } = await verifyDynamicGeminiWebhook(signature);

      console.info("[api/webhooks/gemini] Verified a dynamic webhook.", {
        audience: payload.aud,
        eventType: payload.type ?? payload.event_type,
        issuer: payload.iss,
      });

      return Response.json(
        { status: "received" },
        { headers: { "cache-control": "no-store" } },
      );
    } catch {
      return Response.json(
        { error: "invalid_webhook" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
  }

  try {
    const event = verifyGeminiWebhook(rawBody, request.headers);
    const webhookId = request.headers.get("webhook-id");

    if (!webhookId) {
      return Response.json(
        { error: "invalid_webhook" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    const received = await receiveGeminiWebhook(webhookId, event);

    after(() => processWebhookEvent(received.eventId));

    return Response.json(
      {
        status: received.inserted ? "received" : "duplicate",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return Response.json(
        { error: "invalid_webhook" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    if (error instanceof Error && error.name === "ZodError") {
      console.info(
        "[api/webhooks/gemini] Ignored a signed unsupported webhook event.",
      );

      return Response.json(
        { status: "ignored" },
        { headers: { "cache-control": "no-store" } },
      );
    }

    console.error("[api/webhooks/gemini] Webhook receive failed.", {
      error: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "webhook_receive_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
