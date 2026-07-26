import "server-only";

import { eq, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { oauthStates } from "@/lib/db/schema";

import { OAUTH_STATE_TTL_SECONDS, sanitizeReturnTo } from "./config";
import { constantTimeEqual, createRandomToken, createSha256 } from "./crypto";

export async function createOauthState(returnToValue: string | null) {
  const state = createRandomToken();
  const codeVerifier = createRandomToken();
  const nonce = createRandomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_SECONDS * 1000);
  const db = getDb();

  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, now));
  await db.insert(oauthStates).values({
    stateHash: createSha256(state),
    codeVerifier,
    nonce,
    returnTo: sanitizeReturnTo(returnToValue),
    expiresAt,
  });

  return {
    codeVerifier,
    nonce,
    state,
  };
}

export async function consumeOauthState(
  receivedState: string,
  cookieState: string,
) {
  if (!constantTimeEqual(receivedState, cookieState)) {
    return null;
  }

  const db = getDb();
  const [record] = await db
    .delete(oauthStates)
    .where(eq(oauthStates.stateHash, createSha256(receivedState)))
    .returning();

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return record;
}
