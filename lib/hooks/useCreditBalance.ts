import useSWR from "swr";
import { authFetch } from "@/lib/api";

interface CreditBalance {
  balance: number;
  freeCredits: number;
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function useCreditBalance() {
  const { data, error, isLoading, mutate } = useSWR<CreditBalance>(
    "/api/credits/balance",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    balance: data?.balance ?? null,
    freeCredits: data?.freeCredits ?? 0,
    isLoading,
    error,
    mutate,
  };
}
