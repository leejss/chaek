import "server-only";

import { LibsqlError } from "@libsql/client";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";

import { OAuthAccountConflictError } from "./errors";
import type { GoogleProfile } from "./google";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof LibsqlError &&
    (error.code === "SQLITE_CONSTRAINT" ||
      error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      error.extendedCode === "SQLITE_CONSTRAINT_UNIQUE")
  );
}

async function findUserByGoogleSubject(subject: string) {
  const db = getDb();
  const [record] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
    })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(
      and(eq(accounts.providerId, "google"), eq(accounts.accountId, subject)),
    )
    .limit(1);

  return record ?? null;
}

export async function synchronizeGoogleAccount(
  profile: GoogleProfile,
  scope: string | null,
) {
  const db = getDb();

  try {
    return await db.transaction(async (tx) => {
      const [existingAccount] = await tx
        .select({ userId: accounts.userId })
        .from(accounts)
        .where(
          and(
            eq(accounts.providerId, "google"),
            eq(accounts.accountId, profile.subject),
          ),
        )
        .limit(1);

      if (existingAccount) {
        const [emailOwner] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);

        if (emailOwner && emailOwner.id !== existingAccount.userId) {
          throw new OAuthAccountConflictError();
        }

        const [user] = await tx
          .update(users)
          .set({
            email: profile.email,
            emailVerified: profile.emailVerified,
            image: profile.image,
            name: profile.name,
          })
          .where(eq(users.id, existingAccount.userId))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
          });

        await tx
          .update(accounts)
          .set({ scope })
          .where(
            and(
              eq(accounts.providerId, "google"),
              eq(accounts.accountId, profile.subject),
            ),
          );

        return user;
      }

      const [emailOwner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (emailOwner) {
        throw new OAuthAccountConflictError();
      }

      const [user] = await tx
        .insert(users)
        .values({
          email: profile.email,
          emailVerified: profile.emailVerified,
          image: profile.image,
          name: profile.name,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
        });

      await tx.insert(accounts).values({
        accountId: profile.subject,
        providerId: "google",
        scope,
        userId: user.id,
      });

      return user;
    });
  } catch (error) {
    if (error instanceof OAuthAccountConflictError) {
      throw error;
    }

    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const user = await findUserByGoogleSubject(profile.subject);

    if (user) {
      return user;
    }

    throw error;
  }
}
