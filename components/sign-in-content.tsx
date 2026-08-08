import "server-only";

import { AlertCircleIcon } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import chaekIcon from "@/app/icon.png";
import { buttonVariants } from "@/components/ui/button";
import { sanitizeAuthReturnTo } from "@/lib/auth/config";
import {
  DEFAULT_AUTH_RETURN_TO,
  getAuthErrorMessage,
} from "@/lib/auth/redirects";
import { getCurrentSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export type SignInSearchParams = Promise<{
  error?: string;
  returnTo?: string;
  topic?: string;
}>;

export async function SignInContent({
  searchParams,
}: {
  searchParams: SignInSearchParams;
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
    <div className="text-center">
      <Image
        alt=""
        className="mx-auto size-12 rounded-xl shadow-control"
        src={chaekIcon}
      />
      <h1
        className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl"
        id="sign-in-title"
      >
        Chaek에 로그인
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        콘텐츠를 만들고 작업을 이어가려면 Google 계정으로 로그인하세요.
      </p>

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
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        로그인하면 Chaek의 서비스 이용에 필요한 계정 정보만 사용합니다.
      </p>
    </div>
  );
}
