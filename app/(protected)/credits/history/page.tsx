"use client";

import { useTransactions } from "@/lib/hooks/useTransactions";
import Link from "next/link";

export interface Transaction {
  id: string;
  type: "purchase" | "usage" | "refund" | "free_signup";
  amount: number;
  balanceAfter: number;
  createdAt: string;
  metadata?: {
    bookTitle?: string;
    reason?: string;
    [key: string]: unknown;
  };
}

const typeLabels: Record<Transaction["type"], string> = {
  purchase: "Purchase",
  usage: "Book Creation",
  refund: "Refund",
  free_signup: "Free Signup Bonus",
};

const typeColors: Record<string, string> = {
  purchase: "text-green-600 bg-green-50",
  usage: "text-red-600 bg-red-50",
  refund: "text-orange-600 bg-orange-50",
  free_signup: "text-blue-600 bg-blue-50",
};

export default function CreditsHistoryPage() {
  const { transactions, isLoading, error, loadMore, hasMore } = useTransactions();

  if (isLoading && transactions.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Transaction History
        </h1>
        <Link
          href="/credits"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Purchase Credits
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-12 text-center">
          <p className="mb-4 text-gray-600">No transactions yet</p>
          <Link
            href="/credits"
            className="inline-block rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Purchase Your First Credits
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Balance After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          typeColors[transaction.type]
                        }`}
                      >
                        {typeLabels[transaction.type]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <span
                        className={
                          transaction.amount > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {transaction.balanceAfter}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.metadata &&
                        typeof transaction.metadata === "object" && (
                          <div className="max-w-xs truncate">
                            {"bookTitle" in transaction.metadata &&
                              `Book: ${String(transaction.metadata.bookTitle)}`}
                            {"reason" in transaction.metadata &&
                              `${String(transaction.metadata.reason)}`}
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="rounded-lg bg-gray-100 px-6 py-3 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
