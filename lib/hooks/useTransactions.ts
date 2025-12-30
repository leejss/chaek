import useSWRInfinite from "swr/infinite";
import { authFetch } from "@/lib/api";

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

export interface TransactionsResponse {
  transactions: Transaction[];
  nextCursor?: string;
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function getKey(index: number, previousData: TransactionsResponse | null): string | null {
  if (index === 0) {
    return "/api/credits/transactions";
  }
  if (previousData && previousData.nextCursor) {
    return `/api/credits/transactions?cursor=${previousData.nextCursor}`;
  }
  return null;
}

export function useTransactions() {
  const { data, error, isLoading, size, setSize } = useSWRInfinite<
    TransactionsResponse,
    Error
  >(getKey, fetcher);

  const transactions = data?.flatMap((page) => page.transactions) ?? [];
  const hasMore = data && data.length > 0 && data[data.length - 1].nextCursor;

  return {
    transactions,
    isLoading,
    error,
    loadMore: () => setSize(size + 1),
    hasMore,
  };
}
