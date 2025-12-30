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
      setError(err instanceof Error ? err.message : "Failed to process purchase");
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Purchase Credits
        </h1>
        <p className="text-gray-600">
          Select a package to add credits to your account
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-lg border-2 p-6 ${
              pkg.popular
                ? "border-blue-500 shadow-lg"
                : "border-gray-200"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {pkg.name}
              </h3>
            </div>

            <div className="mb-6">
              <div className="mb-1 text-4xl font-bold text-gray-900">
                ${pkg.price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                {pkg.credits} credits
              </div>
              <div className="text-xs text-gray-500">
                ${pkg.pricePerCredit.toFixed(2)} per credit
              </div>
            </div>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={isProcessing}
              className={`w-full rounded-lg py-3 font-semibold text-white transition-colors ${
                pkg.popular
                  ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                  : "bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400"
              }`}
            >
              {isProcessing ? "Processing..." : "Purchase"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          How Credits Work
        </h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Each book creation costs 10 credits</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>New users receive 5 free credits upon signup</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Credits never expire</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Secure payment processing via Lemon Squeezy</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
