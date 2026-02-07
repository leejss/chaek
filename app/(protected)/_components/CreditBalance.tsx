"use client";

import Link from "next/link";
import { useCreditBalance } from "@/lib/hooks/useCreditBalance";

export default function CreditBalance() {
  const { balance, freeCredits, isLoading } = useCreditBalance();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 text-sm">
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
        {freeCredits > 0 && <span className="text-green-400 text-xs">({freeCredits} free)</span>}
      </div>
      <Link
        href="/credits"
        className="rounded-full bg-brand-600 px-3 py-1 font-bold text-foreground text-sm transition-colors hover:bg-brand-700"
      >
        Top Up
      </Link>
    </div>
  );
}
