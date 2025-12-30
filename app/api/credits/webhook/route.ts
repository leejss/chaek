import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addCredits, refundCredits } from "@/lib/credits/operations";
import { serverEnv } from "@/lib/env";

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

    const event = JSON.parse(rawBody);

    switch (event.meta.event_name) {
      case "order_created":
        await handleOrderCreated(event);
        break;
      case "order_refunded":
        await handleOrderRefunded(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.meta.event_name}`);
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

async function handleOrderCreated(event: any) {
  const customData = event.meta.custom_data;
  const orderId = event.data.id;

  if (!customData?.user_id || !customData?.credits) {
    console.error("Missing custom data in order:", orderId);
    return;
  }

  const creditAmount = parseInt(customData.credits, 10);

  await addCredits({
    userId: customData.user_id,
    amount: creditAmount,
    type: "purchase",
    lemonSqueezyOrderId: orderId,
    metadata: {
      packageId: customData.package_id,
      orderNumber: event.data.attributes.order_number,
      total: event.data.attributes.total,
      currency: event.data.attributes.currency,
    },
  });

  console.log(`Credits added for user ${customData.user_id}: ${creditAmount}`);
}

async function handleOrderRefunded(event: any) {
  const customData = event.meta.custom_data;
  const orderId = event.data.id;

  if (!customData?.user_id || !customData?.credits) {
    console.error("Missing custom data in refund:", orderId);
    return;
  }

  const creditAmount = parseInt(customData.credits, 10);

  await refundCredits({
    userId: customData.user_id,
    amount: creditAmount,
    lemonSqueezyOrderId: orderId,
    metadata: {
      refundedAt: event.data.attributes.refunded_at,
      orderNumber: event.data.attributes.order_number,
    },
  });

  console.log(
    `Credits refunded for user ${customData.user_id}: ${creditAmount}`,
  );
}
