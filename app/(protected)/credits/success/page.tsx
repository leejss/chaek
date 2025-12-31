"use client";

import { useCreditBalance } from "@/lib/hooks/useCreditBalance";
import Link from "next/link";

export default function CreditsSuccessPage() {
  const { balance, isLoading } = useCreditBalance();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your credits have been added to your account
          </p>
        </div>

        {!isLoading && balance !== null && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-sm text-gray-600">Current Balance</div>
            <div className="text-3xl font-bold text-blue-600">
              {balance} credits
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/book/new"
            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-foreground hover:bg-blue-700"
          >
            Create a Book
          </Link>
          <Link
            href="/credits/history"
            className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
          >
            View History
          </Link>
        </div>
      </div>
    </div>
  );
}
