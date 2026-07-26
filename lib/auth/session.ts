import "server-only";

import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./config";
import { createRandomToken, createSha256 } from "./crypto";
import { AuthenticationRequiredError } from "./errors";

export async function createSession(userId: string, previousToken?: string) {
  const token = createRandomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(lt(sessions.expiresAt, now));

    if (previousToken) {
      await tx
        .delete(sessions)
        .where(eq(sessions.tokenHash, createSha256(previousToken)));
    }

    await tx.insert(sessions).values({
      expiresAt,
      tokenHash: createSha256(token),
      userId,
    });
  });

  return { expiresAt, token };
}

export async function deleteSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await getDb()
    .delete(sessions)
    .where(eq(sessions.tokenHash, createSha256(token)));
}

export async function getSessionByToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const db = getDb();
  const tokenHash = createSha256(token);
  const now = new Date();
  const [record] = await db
    .select({
      session: {
        id: sessions.id,
        expiresAt: sessions.expiresAt,
      },
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!record) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  return record;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return getSessionByToken(token);
}

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session) {
    throw new AuthenticationRequiredError();
  }

  return session.user;
}
