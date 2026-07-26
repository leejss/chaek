import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createRandomToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function createSha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

export function createPkceChallenge(codeVerifier: string) {
  return createSha256(codeVerifier);
}

export function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
