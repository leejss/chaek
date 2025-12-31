import { db } from "@/db";
import { creditBalances, creditTransactions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { FREE_SIGNUP_CREDITS } from "./config";

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: unknown }).code === "23505";
}

export async function getUserBalance(userId: string) {
  const result = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (result.length === 0) {
    return { balance: 0, freeCredits: 0 };
  }

  return {
    balance: result[0].balance,
    freeCredits: result[0].freeCredits,
  };
}

export interface AddCreditsParams {
  userId: string;
  amount: number;
  type: "purchase" | "free_signup";
  lemonSqueezyOrderId?: string;
  metadata?: Record<string, unknown>;
}

export async function addCredits(params: AddCreditsParams): Promise<void> {
  const { userId, amount, type, lemonSqueezyOrderId, metadata } = params;

  try {
    await db.transaction(async (tx) => {
      if (type === "purchase" && lemonSqueezyOrderId) {
        const existing = await tx
          .select({ id: creditTransactions.id })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.type, "purchase"),
              eq(creditTransactions.lemonSqueezyOrderId, lemonSqueezyOrderId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          return;
        }
      }

      const currentBalance = await tx
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId))
        .limit(1);

      const current = currentBalance[0] || { balance: 0, freeCredits: 0 };
      const newBalance = current.balance + amount;
      const newFreeCredits =
        type === "free_signup"
          ? current.freeCredits + amount
          : current.freeCredits;

      if (currentBalance.length === 0) {
        await tx.insert(creditBalances).values({
          userId,
          balance: newBalance,
          freeCredits: newFreeCredits,
          updatedAt: new Date(),
        });
      } else {
        await tx
          .update(creditBalances)
          .set({
            balance: newBalance,
            freeCredits: newFreeCredits,
            updatedAt: new Date(),
          })
          .where(eq(creditBalances.userId, userId));
      }

      await tx.insert(creditTransactions).values({
        userId,
        type,
        amount,
        balanceAfter: newBalance,
        lemonSqueezyOrderId,
        metadata,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return;
    }
    throw error;
  }
}

export interface DeductCreditsParams {
  userId: string;
  amount: number;
  bookId?: string;
  metadata?: Record<string, unknown>;
}

export async function deductCredits(
  params: DeductCreditsParams,
): Promise<void> {
  const { userId, amount, bookId, metadata } = params;

  await db.transaction(async (tx) => {
    const currentBalance = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1);

    if (currentBalance.length === 0 || currentBalance[0].balance < amount) {
      throw new Error("Insufficient credits");
    }

    const newBalance = currentBalance[0].balance - amount;

    await tx
      .update(creditBalances)
      .set({
        balance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    await tx.insert(creditTransactions).values({
      userId,
      type: "usage",
      amount: -amount,
      balanceAfter: newBalance,
      bookId,
      metadata,
    });
  });
}

export interface RefundCreditsParams {
  userId: string;
  amount: number;
  lemonSqueezyOrderId: string;
  metadata?: Record<string, unknown>;
}

export async function refundCredits(
  params: RefundCreditsParams,
): Promise<void> {
  const { userId, amount, lemonSqueezyOrderId, metadata } = params;

  try {
    await db.transaction(async (tx) => {
      if (lemonSqueezyOrderId) {
        const existing = await tx
          .select({ id: creditTransactions.id })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.type, "refund"),
              eq(creditTransactions.lemonSqueezyOrderId, lemonSqueezyOrderId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          return;
        }
      }

      const currentBalance = await tx
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId))
        .limit(1);

      if (currentBalance.length === 0) {
        throw new Error("User credit balance not found");
      }

      const newBalance = Math.max(0, currentBalance[0].balance - amount);

      await tx
        .update(creditBalances)
        .set({
          balance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));

      await tx.insert(creditTransactions).values({
        userId,
        type: "refund",
        amount: -amount,
        balanceAfter: newBalance,
        lemonSqueezyOrderId,
        metadata,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return;
    }
    throw error;
  }
}

export interface RefundUsageCreditsParams {
  userId: string;
  amount: number;
  bookId: string;
  metadata?: Record<string, unknown>;
}

export async function refundUsageCredits(
  params: RefundUsageCreditsParams,
): Promise<void> {
  const { userId, amount, bookId, metadata } = params;

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: creditTransactions.id })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.type, "usage_refund"),
          eq(creditTransactions.bookId, bookId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    const currentBalance = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1);

    if (currentBalance.length === 0) {
      throw new Error("User credit balance not found");
    }

    const newBalance = currentBalance[0].balance + amount;

    await tx
      .update(creditBalances)
      .set({
        balance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    await tx.insert(creditTransactions).values({
      userId,
      type: "usage_refund",
      amount,
      balanceAfter: newBalance,
      bookId,
      metadata,
    });
  });
}

export async function grantFreeSignupCredits(userId: string): Promise<void> {
  const existingBalance = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (existingBalance.length > 0 && existingBalance[0].freeCredits > 0) {
    return;
  }

  await addCredits({
    userId,
    amount: FREE_SIGNUP_CREDITS,
    type: "free_signup",
    metadata: { reason: "New user signup bonus" },
  });
}

export async function getCreditTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0,
) {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}
