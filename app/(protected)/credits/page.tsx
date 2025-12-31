"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

const CREDIT_PACKAGES = [
  {
    id: "package_10",
    name: "Starter Pack",
    credits: 10,
    price: 10.0,
    pricePerCredit: 1.0,
  },
  {
    id: "package_50",
    name: "Popular Pack",
    credits: 50,
    price: 40.0,
    pricePerCredit: 0.8,
    popular: true,
  },
  {
    id: "package_100",
    name: "Pro Pack",
    credits: 100,
    price: 70.0,
    pricePerCredit: 0.7,
  },
];

export default function CreditsPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase(packageId: string) {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await authFetch("/api/credits/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process purchase",
      );
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Purchase Credits
        </h1>
        <p className="text-neutral-500">
          Select a package to add credits to your account
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-900/20 p-4 text-red-400 border border-red-900">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-2xl border p-6 ${
              pkg.popular
                ? "border-brand-600 bg-brand-900/5"
                : "border-neutral-800 bg-background"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-foreground">
                Most Popular
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
            </div>

            <div className="mb-6">
              <div className="mb-1 text-4xl font-bold text-foreground">
                ${pkg.price.toFixed(2)}
              </div>
              <div className="text-sm text-neutral-500">
                {pkg.credits} credits
              </div>
              <div className="text-xs text-neutral-600">
                ${pkg.pricePerCredit.toFixed(2)} per credit
              </div>
            </div>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={isProcessing}
              className={`w-full rounded-full py-3 font-bold transition-colors ${
                pkg.popular
                  ? "bg-brand-600 text-foreground hover:bg-brand-700 disabled:bg-brand-900 disabled:opacity-50"
                  : "bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-600 disabled:opacity-50"
              }`}
            >
              {isProcessing ? "Processing..." : "Purchase"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-neutral-900/30 border border-neutral-800 p-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          How Credits Work
        </h2>
        <ul className="space-y-2 text-neutral-400">
          <li className="flex items-start">
            <span className="mr-2 text-brand-600">•</span>
            <span>Each book creation costs 10 credits</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-brand-600">•</span>
            <span>New users receive 5 free credits upon signup</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-brand-600">•</span>
            <span>Credits never expire</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-brand-600">•</span>
            <span>Secure payment processing via Lemon Squeezy</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
