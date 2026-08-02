import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { sanitizeAuthReturnTo } from "@/lib/auth/config";
import {
  DEFAULT_AUTH_RETURN_TO,
  getAuthErrorMessage,
} from "@/lib/auth/redirects";
import { getCurrentSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "로그인 | Chaek",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
    topic?: string;
  }>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);
  let returnTo = DEFAULT_AUTH_RETURN_TO;
  const topic = params.topic?.trim();

  if (params.returnTo) {
    try {
      returnTo = sanitizeAuthReturnTo(params.returnTo);
    } catch {
      // The OAuth start handler will surface a configuration error if needed.
    }
  } else if (topic) {
    returnTo = `/content?${new URLSearchParams({ topic }).toString()}`;
  }

  if (session) {
    redirect(returnTo);
  }

  const errorMessage = getAuthErrorMessage(params.error);
  const oauthSearchParams = new URLSearchParams({ returnTo });

  return (
    <main className="relative flex min-h-svh flex-col">
      <Link
        aria-label="뒤로 가기"
        className={cn(
          buttonVariants({ size: "icon", variant: "outline" }),
          "absolute top-5 left-5 rounded-full sm:top-8 sm:left-8",
        )}
        href={returnTo}
      >
        <ArrowLeftIcon aria-hidden="true" />
      </Link>
      <section className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl leading-[1.08] font-semibold tracking-[-0.04em] sm:text-4xl">
            Chaek에 로그인
          </h1>

          {errorMessage ? (
            <div
              className="mt-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left text-destructive"
              role="alert"
            >
              <AlertCircleIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <p className="text-sm leading-6">{errorMessage}</p>
            </div>
          ) : null}

          <a
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 h-12 w-full px-5",
            )}
            href={`/api/auth/google?${oauthSearchParams.toString()}`}
          >
            Google로 계속하기
          </a>
        </div>
      </section>
    </main>
  );
}
