"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
              next?.startsWith("/") && !next.startsWith("//") && !next.includes("://")
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
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md rounded-xl p-4">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-black text-4xl text-foreground tracking-tight">chaek</h1>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div
            ref={googleBtnRef}
            className={`flex min-h-11 justify-center ${
              loading ? "pointer-events-none opacity-60" : ""
            }`}
          />
          {loading && <p className="text-center text-neutral-500 text-xs">Authenticating...</p>}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper">Loading...</div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
