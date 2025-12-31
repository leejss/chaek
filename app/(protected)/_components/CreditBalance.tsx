"use client";

import { useCreditBalance } from "@/lib/hooks/useCreditBalance";
import Link from "next/link";

export default function CreditBalance() {
  const { balance, freeCredits, isLoading } = useCreditBalance();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Loading...</span>
      </div>
    );
  }

  if (balance === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Credits:</span>
        <span className="font-bold text-foreground">{balance}</span>
        {freeCredits > 0 && (
          <span className="text-xs text-green-400">({freeCredits} free)</span>
        )}
      </div>
      <Link
        href="/credits"
        className="rounded-full bg-brand-600 px-3 py-1 text-sm font-bold text-foreground hover:bg-brand-700 transition-colors"
      >
        Top Up
      </Link>
    </div>
  );
}
