"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { clientEnv } from "@/lib/env";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

export default function LoginPage() {
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
        width: 320, // 필요시 조정
      });
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl md:text-5xl font-bold text-brand-900 tracking-wide">
            book.build
          </h1>
        </div>

        <div
          ref={googleBtnRef}
          className={loading ? "pointer-events-none opacity-60" : ""}
        />
      </div>
    </div>
  );
}
