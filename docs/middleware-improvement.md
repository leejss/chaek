# 🛡️ Next.js 미들웨어 인증 및 세션 관리 개선 가이드

이 문서는 현재 `proxy.ts`의 구조적 장점을 살리면서, 보안성과 사용자 경험(UX)을 극대화하기 위한 개선 방안을 정리합니다.

## 1. 현재 코드 분석 (Current State)

### ✅ 주요 장점 (Strengths)
- **관심사 분리 (Separation of Concerns)**: 경로 판별(`isProtectedPath`), 리다이렉트(`redirectToLogin`) 등의 로직이 함수로 잘 분리되어 읽기 쉽습니다.
- **우수한 UX**: 로그인 리다이렉트 시 원래 목적지를 `next` 파라미터로 넘겨주어, 로그인 후 자연스러운 복귀를 지원합니다.
- **선언적 경로 설정**: `PROTECTED_PREFIXES` 상수를 통해 보호할 경로를 명확하게 정의하고 있습니다.

---

## 2. 핵심 개선 제안 (Core Improvements)

### ① 토큰 유효성 검증 (Token Verification)
- **현황**: 쿠키에 토큰이 존재하는지(`Existence`)만 확인합니다.
- **문제점**: 만료되거나 변조된 토큰도 미들웨어를 통과하며, 실제 데이터 페칭 단계에서 에러가 발생합니다.
- **개선**: 미들웨어는 **Edge Runtime**에서 실행되므로, DB 조회 대신 `jose` 라이브러리 등을 이용해 **JWT 서명 및 만료 시간**을 가볍게 체크하는 로직을 추가합니다.

### ② 자동 세션 연장 (Silent Refresh)
- **현황**: 액세스 토큰이 없으면 즉시 로그인 페이지로 튕겨납니다.
- **개선**: 액세스 토큰이 없더라도 **리프레시 토큰(Refresh Token)**이 있다면, 미들웨어 단계에서 `/api/auth/refresh`를 호출하여 자동으로 새로운 토큰을 발급받습니다. 이를 통해 사용자는 로그아웃 없이 서비스를 계속 이용할 수 있습니다.

### ③ 경로 관리 최적화 (Route Management)
- **현황**: `/book`, `/login` 등의 경로가 코드 곳곳에 하드코딩되어 있습니다.
- **개선**: `routes.ts`와 같은 상수로 통합 관리하여 오타를 방지하고, `config.matcher`와 내부 로직의 동기화를 강화합니다.

---

## 3. 개선된 실행 흐름 (Execution Flow)

새로운 미들웨어의 논리적 흐름은 다음과 같습니다.

1.  **경로 판별**: 요청된 URL이 보호된 경로인지 확인합니다.
2.  **인증 상태 확인**:
    *   **액세스 토큰 있음**: 유효성 검증 후 통과 (`NextResponse.next()`).
    *   **액세스 토큰 없음 & 리프레시 토큰 있음**: 내부 API(`/api/auth/refresh`) 호출 시도.
        *   **갱신 성공**: 새로운 토큰을 응답 헤더(`Set-Cookie`)에 굽고 요청 통과.
        *   **갱신 실패**: 쿠키 삭제 후 로그인 페이지로 리다이렉트.
    *   **둘 다 없음**: 즉시 로그인 페이지로 리다이렉트.

---

## 4. 권장 구현 패턴 (Implementation Pattern)

개선된 로직이 반영된 미들웨어 구조의 예시입니다.

```typescript
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { accessTokenConfig, refreshTokenConfig } from "@/lib/authTokens";

// [개선] 자동 세션 연장 로직 (Silent Refresh)
async function performRefresh(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get(refreshTokenConfig.name)?.value;
  if (!refreshToken) return null;

  try {
    const response = await fetch(new URL("/api/auth/refresh", request.url), {
      method: "POST",
      headers: { Cookie: request.headers.get("cookie") || "" },
    });

    if (!response.ok) return null;

    const nextResponse = NextResponse.next();
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) nextResponse.headers.set("set-cookie", setCookie);
    
    return nextResponse;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasAccessToken = hasAccessTokenCookie(request);

  // 보호 경로 접근 시
  if (isProtectedPath(pathname) && !hasAccessToken) {
    // 1. 리프레시 시도
    const refreshedResponse = await performRefresh(request);
    if (refreshedResponse) return refreshedResponse;

    // 2. 실패 시 로그인 이동
    return redirectToLogin(request);
  }

  // 게스트 전용 경로(로그인 등) 접근 시
  if (isGuestOnlyPath(pathname) && hasAccessToken) {
    return redirectToPostLogin(request);
  }

  return NextResponse.next();
}
```

---

## 5. 결론 (Conclusion)

이러한 개선을 통해 얻을 수 있는 이점은 명확합니다:
1.  **보안 강화**: 유효하지 않은 토큰을 미들웨어 단계에서 조기에 차단합니다.
2.  **사용자 경험 향상**: 사용자가 토큰 만료를 인지하지 못하게 하여 서비스 이탈을 방지합니다.
3.  **코드 안정성**: 중복된 문자열을 상수로 관리하여 유지보수 비용을 낮춥니다.

---
*문서 작성일: 2025-12-19*

