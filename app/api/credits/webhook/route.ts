import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addCredits, refundCredits } from "@/lib/credits/operations";
import { serverEnv } from "@/lib/env";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return value;
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Signature");

    if (!signature) {
      console.error("Missing X-Signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const hmac = crypto.createHmac(
      "sha256",
      serverEnv.LEMONSQUEEZY_WEBHOOK_SECRET,
    );
    const digest = hmac.update(rawBody).digest("hex");

    if (digest !== signature) {
      console.error("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event: unknown = JSON.parse(rawBody);
    const eventRecord = getRecord(event);
    if (!eventRecord) {
      console.error("Invalid webhook event shape");
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const meta = getRecord(eventRecord.meta);
    const eventName = getString(meta?.event_name);
    if (!eventName) {
      console.error("Missing event_name");
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    switch (eventName) {
      case "order_created":
        await handleOrderCreated(event);
        break;
      case "order_refunded":
        await handleOrderRefunded(event);
        break;
      default:
        console.log(`Unhandled event type: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleOrderCreated(event: unknown) {
  const eventRecord = getRecord(event);
  const meta = getRecord(eventRecord?.meta);
  const customData = getRecord(meta?.custom_data);

  const data = getRecord(eventRecord?.data);
  const orderId = getString(data?.id);

  const userId = getString(customData?.user_id);
  const creditsRaw = getString(customData?.credits);
  if (!orderId || !userId || !creditsRaw) {
    console.error("Missing custom data in order:", orderId);
    return;
  }

  const creditAmount = parseInt(creditsRaw, 10);
  if (!Number.isFinite(creditAmount)) {
    console.error("Invalid credits in order:", orderId);
    return;
  }

  const packageId = getString(customData?.package_id);
  const attributes = getRecord(data?.attributes);
  const orderNumber = attributes?.order_number;
  const total = attributes?.total;
  const currency = attributes?.currency;

  await addCredits({
    userId,
    amount: creditAmount,
    type: "purchase",
    lemonSqueezyOrderId: orderId,
    metadata: {
      packageId,
      orderNumber,
      total,
      currency,
    },
  });

  console.log(`Credits added for user ${userId}: ${creditAmount}`);
}

async function handleOrderRefunded(event: unknown) {
  const eventRecord = getRecord(event);
  const meta = getRecord(eventRecord?.meta);
  const customData = getRecord(meta?.custom_data);

  const data = getRecord(eventRecord?.data);
  const orderId = getString(data?.id);

  const userId = getString(customData?.user_id);
  const creditsRaw = getString(customData?.credits);
  if (!orderId || !userId || !creditsRaw) {
    console.error("Missing custom data in refund:", orderId);
    return;
  }

  const creditAmount = parseInt(creditsRaw, 10);
  if (!Number.isFinite(creditAmount)) {
    console.error("Invalid credits in refund:", orderId);
    return;
  }

  const attributes = getRecord(data?.attributes);
  const refundedAt = attributes?.refunded_at;
  const orderNumber = attributes?.order_number;

  await refundCredits({
    userId,
    amount: creditAmount,
    lemonSqueezyOrderId: orderId,
    metadata: {
      refundedAt,
      orderNumber,
    },
  });

  console.log(
    `Credits refunded for user ${userId}: ${creditAmount}`,
  );
}
