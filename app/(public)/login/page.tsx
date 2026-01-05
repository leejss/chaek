"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clientEnv } from "@/lib/env";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const clientId = clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          const idToken = response.credential;
          if (!idToken) return;

          setLoading(true);
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ id_token: idToken }),
            });

            if (!res.ok) throw new Error("Login failed");

            const next = searchParams.get("next");
            const safeNext =
              next &&
              next.startsWith("/") &&
              !next.startsWith("//") &&
              !next.includes("://")
                ? next
                : null;

            window.location.href = safeNext ?? "/book";
          } finally {
            setLoading(false);
          }
        },
        auto_select: false,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 350,
      });
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-[350px] flex flex-col gap-8 relative items-center">
        {/* Logo Area */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold text-foreground tracking-tighter">
            chaek
          </h1>
        </div>

        <div className="flex flex-col gap-4 w-full items-center">
          <h2 className="text-2xl font-bold text-foreground">
            Sign in to chaek
          </h2>

          <div
            ref={googleBtnRef}
            className={`min-h-11 flex justify-center ${
              loading ? "pointer-events-none opacity-60" : ""
            }`}
          />

          {loading && (
            <p className="text-xs text-neutral-500 animate-pulse text-center">
              Authenticating...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
