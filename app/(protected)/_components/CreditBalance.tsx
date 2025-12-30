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
        <span className="text-gray-600">Credits:</span>
        <span className="font-semibold text-gray-900">{balance}</span>
        {freeCredits > 0 && (
          <span className="text-xs text-green-600">
            ({freeCredits} free)
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
