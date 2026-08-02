export const DEFAULT_AUTH_RETURN_TO = "/content";

export const authErrorMessages = {
  access_denied: "Google 로그인이 취소되었습니다.",
  account_conflict:
    "같은 이메일이 다른 로그인 계정에 연결되어 있습니다. 자동으로 병합하지 않았습니다.",
  configuration: "Google 로그인 설정을 확인해 주세요.",
  invalid_state: "로그인 요청이 만료되었거나 유효하지 않습니다.",
  oauth_failed: "Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.",
  session_expired: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
} as const;

export type AuthErrorCode = keyof typeof authErrorMessages;

export function getAuthErrorMessage(value: string | undefined) {
  if (!value || !Object.hasOwn(authErrorMessages, value)) {
    return null;
  }

  return authErrorMessages[value as AuthErrorCode];
}

export function sanitizeReturnToValue(
  value: string | null | undefined,
  baseUrl: URL,
  fallback = "/",
) {
  if (!value?.startsWith("/")) {
    return fallback;
  }

  try {
    const returnToUrl = new URL(value, baseUrl);

    if (returnToUrl.origin !== baseUrl.origin) {
      return fallback;
    }

    return `${returnToUrl.pathname}${returnToUrl.search}${returnToUrl.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeAuthReturnToValue(
  value: string | null | undefined,
  baseUrl: URL,
  fallback = DEFAULT_AUTH_RETURN_TO,
) {
  const returnTo = sanitizeReturnToValue(value, baseUrl, fallback);
  const pathname = new URL(returnTo, baseUrl).pathname;

  if (
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  ) {
    return fallback;
  }

  return returnTo;
}

export function createSignInPath({
  error,
  returnTo = DEFAULT_AUTH_RETURN_TO,
}: {
  error?: AuthErrorCode;
  returnTo?: string;
} = {}) {
  const searchParams = new URLSearchParams({ returnTo });

  if (error) {
    searchParams.set("error", error);
  }

  return `/sign-in?${searchParams.toString()}`;
}
