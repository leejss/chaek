import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCheckout } from "@/lib/credits/lemonsqueezy";
import { getCreditPackage } from "@/lib/credits/config";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { serverEnv } from "@/lib/env";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const CheckoutSchema = z.object({
  packageId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get(accessTokenConfig.name)?.value;
    if (!accessToken) {
      throw new HttpError(401, "Missing access token");
    }

    const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
    const { userId } = await verifyAccessJWT(accessToken, secret);

    const jsonResult = await readJson(req);
    if (!jsonResult.ok) {
      throw jsonResult.error;
    }

    const body = CheckoutSchema.parse(jsonResult.data);
    const pkg = getCreditPackage(body.packageId);

    if (!pkg) {
      throw new HttpError(400, "Invalid package ID");
    }

    if (!pkg.variantId) {
      throw new HttpError(
        500,
        "Lemon Squeezy variant ID not configured for this package",
      );
    }

    const user = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new HttpError(404, "User not found");
    }

    const origin = req.headers.get("origin") || "";
    const checkout = await createCheckout({
      variantId: pkg.variantId,
      userId,
      packageId: pkg.id,
      credits: pkg.credits,
      userEmail: user[0].email,
      successUrl: `${origin}/credits/success`,
      cancelUrl: `${origin}/credits`,
    });

    return NextResponse.json({
      ok: true,
      url: checkout.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);

    const httpError =
      error instanceof InvalidJsonError
        ? new HttpError(400, "Invalid JSON")
        : error instanceof HttpError
        ? error
        : null;

    if (httpError) {
      return NextResponse.json(
        { error: httpError.publicMessage, ok: false },
        { status: httpError.status },
      );
    }

    return NextResponse.json(
      { error: "Internal server error", ok: false },
      { status: 500 },
    );
  }
}
