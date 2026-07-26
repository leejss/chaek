import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  LogOutIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import chaekIcon from "@/app/icon.png";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "로그인 | Chaek",
};

const errorMessages: Record<string, string> = {
  access_denied: "Google 로그인이 취소되었습니다.",
  account_conflict:
    "같은 이메일이 다른 로그인 계정에 연결되어 있습니다. 자동으로 병합하지 않았습니다.",
  configuration: "Google OAuth 환경변수를 확인해 주세요.",
  invalid_state: "로그인 요청이 만료되었거나 유효하지 않습니다.",
  oauth_failed: "Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);
  const errorMessage = error ? errorMessages[error] : null;

  return (
    <main className="min-h-svh px-5 sm:px-8">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col">
        <header className="flex h-20 shrink-0 items-center border-b border-border">
          <div className="flex items-center gap-3">
            <Image alt="" className="size-8 rounded-md" src={chaekIcon} />
            <span className="text-sm font-semibold tracking-[-0.02em]">
              Chaek
            </span>
          </div>
        </header>

        <section
          aria-labelledby="sign-in-title"
          className="flex flex-1 items-center py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-lg">
            <h1
              id="sign-in-title"
              className="text-4xl leading-[1.08] font-medium tracking-[-0.045em] text-balance sm:text-5xl"
            >
              {session ? "로그인된 계정" : "로그인"}
            </h1>

            {errorMessage ? (
              <div
                className="mt-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive"
                role="alert"
              >
                <AlertCircleIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                <p className="text-sm leading-6">{errorMessage}</p>
              </div>
            ) : null}

            {session ? (
              <div className="mt-8">
                <div className="rounded-xl border border-border bg-card p-4 shadow-control">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
                    >
                      {session.user.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.user.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-medium text-live">
                      <CheckIcon aria-hidden="true" className="size-3.5" />
                      연결됨
                    </span>
                  </div>
                </div>

                <form action="/api/auth/logout" className="mt-4" method="post">
                  <button
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "w-full",
                    )}
                    type="submit"
                  >
                    이 기기에서 로그아웃
                    <LogOutIcon data-icon="inline-end" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-8">
                <a
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 w-full justify-between px-5",
                  )}
                  href="/api/auth/google?returnTo=%2Fsign-in"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-6 place-items-center rounded-sm bg-primary-foreground text-xs font-semibold text-primary"
                    >
                      G
                    </span>
                    Google로 계속하기
                  </span>
                  <ArrowRightIcon data-icon="inline-end" />
                </a>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
