import "server-only";

import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthorizedReconciliationRequest(request: Request) {
  const secret = process.env.AI_RECONCILIATION_SECRET;

  if (!secret) {
    throw new Error(
      "AI_RECONCILIATION_SECRET environment variable is not configured.",
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return safeEqual(authorization.slice("Bearer ".length), secret);
}
