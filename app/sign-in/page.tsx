import type { Metadata } from "next";

import { getCurrentSession } from "@/lib/auth/session";

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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <section className="w-full border-y border-rule py-10">
        <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Chaek account
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold tracking-tight">
          Google 계정으로 로그인
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
          Authorization Code, PKCE, state, nonce 검증을 서버에서 직접
          처리합니다. Google 비밀번호는 Chaek에 전달되지 않습니다.
        </p>

        {errorMessage ? (
          <p
            className="mt-6 border-l-2 border-destructive pl-4 text-sm leading-6 text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {session ? (
          <div className="mt-8 border-t border-rule pt-6">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.user.email}
            </p>
            <form action="/api/auth/logout" className="mt-6" method="post">
              <button
                className="inline-flex min-h-10 items-center justify-center border border-rule-strong px-4 text-sm font-medium transition-colors hover:bg-foreground hover:text-background"
                type="submit"
              >
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          <a
            className="mt-8 inline-flex min-h-11 items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            href="/api/auth/google?returnTo=%2Fsign-in"
          >
            Google로 계속하기
          </a>
        )}
      </section>
    </main>
  );
}
