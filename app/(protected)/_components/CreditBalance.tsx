"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import Link from "next/link";

interface CreditBalanceData {
  balance: number;
  freeCredits: number;
}

export default function CreditBalance() {
  const [balance, setBalance] = useState<CreditBalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await authFetch("/api/credits/balance", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setBalance({
            balance: data.balance,
            freeCredits: data.freeCredits,
          });
        }
      } catch (error) {
        console.error("Failed to fetch credit balance:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Loading...</span>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Credits:</span>
        <span className="font-semibold text-gray-900">{balance.balance}</span>
        {balance.freeCredits > 0 && (
          <span className="text-xs text-green-600">
            ({balance.freeCredits} free)
          </span>
        )}
      </div>
      <Link
        href="/credits"
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
      >
        Top Up
      </Link>
    </div>
  );
}
