# Google OAuth 설계 이유와 용어 해설

이 문서는 [`google-oauth-flow.md`](./google-oauth-flow.md)의 보충 문서다.

기존 문서가 Chaek의 Google 로그인 구현이 **무엇으로 구성되고 어떻게 동작하는지**를 설명한다면, 이 문서는 다음 질문에 집중한다.

- 왜 단순히 Google이 돌려준 사용자 정보를 믿으면 안 되는가?
- 왜 `state`, PKCE, `nonce`를 모두 사용해야 하는가?
- 왜 Google token과 Chaek session을 분리하는가?
- 왜 브라우저와 DB에 서로 다른 값을 저장하는가?
- 왜 Google `sub`와 Chaek `users.id`를 분리하는가?
- 문서와 코드에 등장하는 OAuth/OIDC, HTTP, 암호, cookie, DB 용어는 무엇을 뜻하는가?

구현 절차, 파일별 책임, Route 계약, 환경 변수 설정, 검증 방법은 기존 문서를 기준으로 한다. 이 문서는 그 내용을 다시 나열하지 않고, 설계의 원인과 판단 기준을 이해하기 위한 해설을 추가한다.

## 먼저 보는 요약

Chaek의 Google 로그인은 “Google이 사용자를 확인했으니 바로 로그인 완료”라는 한 단계가 아니다. 서로 다른 출처의 증거를 순서대로 검증하면서 신뢰를 옮기는 과정이다.

```text
로그인을 시작한 브라우저가 맞는가?
        ↓ state
돌아온 authorization code를 이 서버가 교환할 자격이 있는가?
        ↓ PKCE + client secret
받은 ID token을 정말 Google이 Chaek을 위해 발급했는가?
        ↓ signature + iss + aud + exp + nonce
검증된 Google 계정은 어떤 Chaek 사용자인가?
        ↓ sub → accounts → users.id
이후 요청도 같은 Chaek 사용자의 요청인가?
        ↓ Chaek opaque session
그 사용자가 이 데이터에 접근할 권한도 있는가?
        ↓ users.id와 리소스 owner 비교
```

핵심 설계 판단은 다음과 같다.

| 설계 | 왜 필요한가? |
| --- | --- |
| Authorization Code Flow | Google token과 client secret을 브라우저에 맡기지 않고 서버 간 통신으로 처리하기 위해 |
| OpenID Connect | API 사용 권한이 아니라 “누가 로그인했는가”라는 identity 증명을 받기 위해 |
| `state` | callback이 Chaek에서 시작한 **같은 브라우저의 같은 로그인 시도**에 속하는지 확인하기 위해 |
| PKCE | authorization code만 탈취한 공격자가 그 code를 교환하지 못하게 하기 위해 |
| `nonce` | 유효하지만 다른 로그인 시도에서 발급된 ID token의 재사용을 막기 위해 |
| ID token의 서명·claim 검증 | “JWT 모양의 데이터”가 아니라 “Google이 Chaek을 위해 발급한 현재 유효한 증명”인지 확인하기 위해 |
| Google `sub` 사용 | 이메일 변경과 무관한 provider 내부의 안정적인 사용자 식별자를 사용하기 위해 |
| `accounts`와 `users` 분리 | Google identity와 Chaek의 제품 데이터를 느슨하게 연결해 provider 변경·추가에 대비하기 위해 |
| Chaek 자체 session | Google token의 수명과 권한을 애플리케이션 로그인 상태에서 분리하고 Chaek이 세션을 폐기할 수 있게 하기 위해 |
| cookie 원본·DB hash 분리 | DB 유출만으로는 브라우저의 session token을 재현하기 어렵게 하기 위해 |
| 인증과 인가 분리 | 로그인한 사용자라도 다른 사용자의 데이터에는 접근하지 못하게 하기 위해 |

이 문서를 처음 읽는다면 다음 순서가 가장 이해하기 쉽다.

1. [하나의 로그인에 왜 여러 단계가 필요한가](#하나의-로그인에-왜-여러-단계가-필요한가)
2. [`state`, PKCE, `nonce`는 왜 셋 다 필요한가](#state-pkce-nonce는-왜-셋-다-필요한가)
3. [ID token은 왜 decode가 아니라 verify해야 하는가](#id-token은-왜-decode가-아니라-verify해야-하는가)
4. [Google 로그인 후 왜 Chaek session을 다시 만드는가](#google-로그인-후-왜-chaek-session을-다시-만드는가)
5. [문맥별 용어집](#문맥별-용어집)

## 하나의 로그인에 왜 여러 단계가 필요한가

### 로그인은 한 번의 확인이 아니라 신뢰의 전달이다

Chaek 서버가 처음부터 알고 있는 사실은 매우 적다.

사용자가 “Google로 계속하기”를 눌렀다는 요청만으로는 다음을 알 수 없다.

- 이 요청을 실제 사용자가 시작했는가?
- callback으로 돌아온 값이 이 로그인 시도와 관련 있는가?
- callback의 code가 중간에 탈취되지 않았는가?
- ID token을 정말 Google이 발급했는가?
- 그 token이 Chaek을 대상으로 발급됐는가?
- 그 token이 아직 유효한가?
- 확인된 Google 계정이 어떤 Chaek 사용자와 연결되는가?
- 이후 요청이 방금 로그인한 브라우저에서 온 것인가?

따라서 각 단계는 앞 단계가 제공하지 못하는 새로운 증거를 추가한다.

| 단계 | 새로 얻는 증거 | 아직 증명하지 못하는 것 |
| --- | --- | --- |
| 로그인 시작 | Chaek이 무작위 `state`, verifier, `nonce`를 만들었다 | 사용자가 Google에서 누구로 인증될지 |
| Google callback | Google이 `code`와 `state`를 callback으로 보냈다 | code를 가진 사람이 정당한 시작 주체인지, 사용자가 누구인지 |
| state 소비 | 같은 브라우저·같은 시작 요청과 연결된다 | code가 탈취되지 않았는지, token이 진짜인지 |
| code 교환 | Google이 code와 PKCE verifier의 관계를 인정했다 | 반환된 ID token의 모든 claim이 Chaek 계약에 맞는지 |
| ID token 검증 | Google이 Chaek을 위해 현재 유효한 identity를 증명했다 | 이 identity가 어떤 내부 사용자인지 |
| account 동기화 | Google `sub`가 Chaek `users.id`로 해석됐다 | 이후 HTTP 요청이 계속 같은 사용자의 것인지 |
| session 발급 | 브라우저가 Chaek의 로그인 상태를 계속 증명할 수 있다 | 그 사용자가 특정 데이터에 접근할 권한이 있는지 |
| 소유권 검사 | 현재 사용자가 특정 리소스의 owner임을 확인했다 | 없음. 해당 요청의 인증과 인가가 모두 완료된다 |

여기서 중요한 태도는 **값이 존재한다는 이유만으로 신뢰하지 않는 것**이다. 각 값은 누가 만들었는지, 누구를 대상으로 하는지, 어느 시도에 속하는지, 언제까지 유효한지를 확인한 뒤에만 다음 단계의 근거가 된다.

### 여권과 출입증 비유

역할을 처음 이해할 때는 다음 비유가 도움이 된다.

| 실제 구현 | 비유 |
| --- | --- |
| Google 로그인 | 여권 발급 기관이 본인을 확인하는 과정 |
| Google ID token | 발급 기관의 서명이 있는 일회성 입국 심사 자료 |
| Chaek의 ID token 검증 | 서명, 발급 기관, 수신 국가, 유효기간을 확인하는 입국 심사 |
| Google `sub` | 여권 발급 기관 안에서 변하지 않는 개인 식별번호 |
| Chaek `users.id` | 입국 후 Chaek 내부에서 부여하는 회원 번호 |
| Chaek session token | Chaek 시설에서 사용하는 출입증 |
| authorization 검사 | 출입증 소지자가 특정 방에도 들어갈 수 있는지 확인하는 권한 검사 |

이 비유에서 여권을 확인했다고 해서 모든 방에 들어갈 수 있는 것은 아니다. 마찬가지로 Google 인증 성공은 Chaek의 사용자라는 사실을 정할 뿐, 모든 `ai_jobs`를 읽을 권한까지 주지는 않는다.

또한 이 비유는 개념을 돕기 위한 것이며 실제 token의 법적 의미나 수명주기와 완전히 같지는 않다.

## 왜 OAuth 2.0만으로 끝내지 않고 OpenID Connect를 사용하는가

### OAuth 2.0이 원래 답하는 질문

OAuth 2.0은 기본적으로 다음 질문에 답한다.

> 이 애플리케이션이 사용자를 대신해 어떤 API 작업을 수행하도록 허용됐는가?

예를 들어 Chaek이 Google Drive 파일을 읽으려면 Drive read scope에 대한 동의를 받고 access token을 Google API에 제시해야 한다. 이때 핵심은 identity 자체보다 **위임된 API 권한**이다.

### Chaek이 지금 답해야 하는 질문

현재 Chaek이 필요한 것은 다음 질문의 답이다.

> Google에서 인증을 마친 사용자가 누구인가?

이 질문을 OAuth 2.0 위에서 표준화한 계층이 OpenID Connect, 줄여서 OIDC다. authorization request에 `openid` scope를 포함하면 Google은 code 교환 결과에 ID token을 포함할 수 있다.

따라서 현재 Chaek의 중심 결과물은 다음처럼 구분된다.

```text
Access token
  → Google API를 호출할 권한
  → 현재 Chaek은 사용하지 않음

ID token
  → Google이 인증한 identity에 대한 서명된 진술
  → Chaek이 검증 후 로그인 identity로 사용
```

### 왜 Google userinfo endpoint를 access token으로 호출하지 않는가

검증된 ID token에 현재 필요한 `sub`, `email`, `email_verified`, `name`, `picture`가 들어 있으므로 별도의 userinfo API 호출이 필요하지 않다.

불필요한 API 호출을 생략하면 다음이 줄어든다.

- 네트워크 실패 지점
- access token을 더 오래 보관해야 할 이유
- token 노출 가능성이 있는 코드 경로
- Google API 권한과 로그인 identity가 섞일 가능성

나중에 Drive나 Calendar 기능이 생기면 access token과 refresh token의 저장·암호화·회전·철회 정책을 별도 기능으로 설계해야 한다. “Google 로그인”이 이미 구현됐다는 이유로 기존 session 구조에 Google API token을 섞어서는 안 된다.

## 왜 Authorization Code Flow를 사용하는가

### 브라우저는 통과 지점이지 token 교환의 신뢰 주체가 아니다

브라우저는 Google 로그인 화면으로 이동하고 callback을 따라 Chaek으로 돌아오는 역할을 한다. 그러나 브라우저 JavaScript에 다음 값을 맡기지 않는다.

- `GOOGLE_OAUTH_CLIENT_SECRET`
- PKCE `code_verifier`
- Google token endpoint 응답
- 검증 전 ID token payload

브라우저는 사용자의 장치에서 실행되므로 서버가 완전히 통제할 수 있는 환경이 아니다. 브라우저 extension, XSS, 개발자 도구, 잘못된 client bundle 구성 등으로 값이 노출될 수 있다.

Authorization Code Flow에서는 Google이 브라우저에 완성된 로그인 session을 직접 주지 않는다. 대신 짧게 사용할 authorization code를 Chaek callback으로 보내고, Chaek 서버가 Google token endpoint와 직접 통신해 code를 ID token으로 교환한다.

```text
Front channel
Browser ↔ Google authorization endpoint ↔ Chaek callback
사용자 이동과 redirect가 보이는 구간

Back channel
Chaek server ↔ Google token endpoint
브라우저를 통하지 않는 서버 간 token 교환 구간
```

이 구조의 목적은 “브라우저를 전혀 사용하지 않는다”가 아니라, **민감한 교환과 최종 검증을 서버 경계 안으로 옮기는 것**이다.

### client secret이 있는데 왜 PKCE도 사용하는가

`client_secret`은 “이 token 교환 요청을 보낸 애플리케이션이 Chaek 서버인가”를 증명한다. PKCE는 “이 code를 교환하는 주체가 해당 authorization request를 시작할 때 verifier를 만든 주체인가”를 연결한다.

둘은 증명 대상이 다르다.

| 장치 | 주로 증명하는 관계 |
| --- | --- |
| `client_secret` | Google Cloud에 등록된 OAuth client ↔ token 교환을 요청한 서버 |
| PKCE | authorization request를 시작한 주체 ↔ authorization code를 교환하는 주체 |

Chaek은 client secret을 보관할 수 있는 confidential client지만, PKCE를 함께 사용해 code 탈취에 대한 방어를 겹친다. 이를 defense in depth, 즉 다층 방어라고 부른다.

### authorization code는 로그인 완료 증명이 아니다

callback URL에 `code`가 있다는 사실만으로 사용자를 로그인시키면 안 된다.

authorization code는 다음 특성을 가진 **교환권**에 가깝다.

- 수명이 짧다.
- 일반적으로 한 번만 사용할 수 있다.
- 특정 `client_id`와 `redirect_uri`에 묶인다.
- PKCE를 사용하면 특정 `code_verifier`에도 묶인다.
- 사용자 profile을 직접 신뢰할 수 있는 형태로 제공하지 않는다.

Chaek은 code를 Google token endpoint에서 교환하고, 그 결과로 받은 ID token을 다시 검증한 뒤에야 사용자를 식별한다.

## `state`, PKCE, `nonce`는 왜 셋 다 필요한가

세 값은 모두 하나의 로그인 시도를 묶는 것처럼 보여 혼동하기 쉽다. 그러나 서로 다른 지점에서 서로 다른 대상을 연결한다.

| 장치 | 시작할 때 만드는 값 | 외부로 보내는 값 | 나중에 비교하는 대상 | 막으려는 핵심 문제 |
| --- | --- | --- | --- | --- |
| `state` | 무작위 `state` | 원본 `state` | callback query, browser cookie, DB hash | callback이 다른 브라우저·다른 로그인 시도와 섞이는 문제 |
| PKCE | `code_verifier` | `SHA-256(verifier)`인 `code_challenge` | code 교환 요청의 원본 verifier | code만 탈취한 사람이 교환하는 문제 |
| `nonce` | 무작위 `nonce` | 원본 `nonce` | 서명 검증된 ID token 안의 `nonce` claim | 다른 로그인 시도의 ID token을 재사용하는 문제 |

한 문장씩 줄이면 다음과 같다.

- `state`: **이 callback이 내가 시작한 로그인인가?**
- PKCE: **이 code를 교환하는 서버가 시작할 때의 비밀값을 가지고 있는가?**
- `nonce`: **이 ID token이 바로 이 로그인 시도를 위해 발급됐는가?**

### `state`가 없으면 어떤 문제가 생기는가

공격자가 자신의 Google 계정으로 Chaek 로그인을 시작한 뒤, 그 callback을 피해자의 브라우저가 열게 만들었다고 가정한다.

Chaek이 callback의 `code`만 보고 로그인시키면 피해자 브라우저가 공격자의 Chaek 계정에 로그인될 수 있다. 이후 피해자가 자신이 작성한다고 생각한 데이터가 공격자의 계정에 저장될 수 있다. 이것이 login CSRF의 대표적인 위험이다.

Chaek은 이를 막기 위해 다음 세 증거를 요구한다.

1. callback URL의 원본 `state`
2. 로그인 시작 때 같은 브라우저에 설정한 HttpOnly cookie의 원본 `state`
3. DB에 저장된 `SHA-256(state)` 행

공격자가 callback URL을 전달할 수 있더라도 피해자 브라우저에는 그 로그인 시도와 연결된 cookie가 없다. 따라서 callback이 중단된다.

### 왜 `state`를 cookie와 DB 양쪽에 두는가

두 저장소는 서로 다른 성질을 제공한다.

| 저장소 | 제공하는 성질 |
| --- | --- |
| 브라우저 cookie | callback이 로그인 시작에 사용한 같은 브라우저에서 돌아왔는지 연결 |
| 서버 DB | 상태의 만료, 일회성 소비, PKCE verifier·nonce·`returnTo` 보관 |

cookie만 사용하면 브라우저 연결은 만들 수 있지만, 서버 여러 instance에서 callback의 1회 사용을 원자적으로 제어하기 어렵다. DB만 사용하면 callback URL에 있는 유효한 `state`를 어느 브라우저가 가져왔는지 구분하기 어렵다.

그래서 Chaek은 browser binding과 server-side one-time state를 결합한다.

### 왜 DB에는 원본 `state`가 아니라 hash를 저장하는가

DB에서 필요한 작업은 “받은 원본 state가 등록된 값인가”를 조회하는 것이다. 원본을 다시 외부로 보낼 필요는 없다. 따라서 DB에는 `SHA-256(state)`만 저장할 수 있다.

이 분리는 DB 내용만 노출됐을 때 저장된 값을 callback query와 cookie에 그대로 복사해 사용하는 것을 어렵게 한다. 다만 hash 자체가 모든 문제를 해결하는 것은 아니다. 안전성은 충분히 긴 무작위 원본, 짧은 만료, cookie binding, 일회성 소비가 함께 만든다.

### 왜 `DELETE ... RETURNING`으로 먼저 소비하는가

다음처럼 조회와 삭제를 나누면 두 callback이 거의 동시에 들어왔을 때 둘 다 조회에 성공할 수 있다.

```text
Callback A: state 조회 성공
Callback B: state 조회 성공
Callback A: state 삭제
Callback B: 이미 읽은 값으로 계속 진행
```

`DELETE ... RETURNING`은 “존재하면 삭제하고 그 행을 돌려준다”를 하나의 DB 명령으로 수행한다.

```text
Callback A: 삭제와 반환 성공
Callback B: 삭제할 행이 없으므로 실패
```

이것은 callback replay를 막는 one-time consumption이다.

Chaek은 state를 Google token 교환보다 먼저 소비한다. 이후 네트워크 timeout이 발생하면 사용자는 로그인을 다시 시작해야 한다. 재시도 편의보다 같은 callback을 반복 사용할 수 없다는 보안 성질을 우선한 선택이다.

### PKCE가 없으면 어떤 문제가 생기는가

authorization code가 브라우저의 주소 이동, 잘못된 로그, 악성 extension, 중간 시스템 등을 통해 노출됐다고 가정한다.

PKCE가 없다면 code와 client 관련 정보만으로 token 교환을 시도할 여지가 생긴다. PKCE를 사용하면 공격자는 code뿐 아니라 로그인 시작 때 서버가 만든 원본 `code_verifier`도 알아야 한다.

Chaek은 다음 관계를 만든다.

```text
code_verifier
    │
    ├── 원본: Chaek DB에만 보관
    │
    └── SHA-256 + Base64URL
              ↓
        code_challenge
              ↓
        Google authorization request에 포함
```

callback 뒤 Chaek이 원본 verifier를 token endpoint로 보내면 Google이 다시 challenge를 계산해 처음 값과 비교한다.

### 왜 `code_challenge_method=S256`인가

PKCE는 원본 verifier를 그대로 challenge로 보내는 `plain` 방식도 정의하지만, `S256`은 verifier의 SHA-256 결과만 authorization request에 노출한다.

authorization request를 본 주체가 challenge를 알아도 원본 verifier를 현실적으로 역산하기 어렵다. 따라서 Chaek은 `S256`만 사용한다.

### `nonce`가 없으면 어떤 문제가 생기는가

공격자가 과거 또는 다른 로그인 시도에서 발급된 유효한 ID token을 가져왔다고 가정한다.

서명, issuer, audience, 만료만 맞는 token이라도 “현재 브라우저가 지금 시작한 로그인”의 결과라는 보장은 없다. 로그인 시작 때 만든 `nonce`를 authorization request에 포함하면 Google이 그 값을 ID token claim에 넣는다.

Chaek은 서명 검증이 끝난 ID token의 `nonce`와 DB에 저장한 현재 시도의 nonce를 비교한다. 따라서 다른 시도에서 가져온 token은 nonce가 달라 거부된다.

### `state` 하나로 `nonce`를 대신할 수 없는 이유

`state`는 authorization response의 query에 돌아오는 값이고, `nonce`는 Google이 서명한 ID token 내부에 들어가는 claim이다.

즉 검증하는 경계가 다르다.

```text
state
Chaek 시작 요청 ↔ browser callback

nonce
Chaek 시작 요청 ↔ Google이 서명한 ID token
```

callback이 올바른 브라우저에서 왔다는 사실과 ID token이 현재 로그인 시도에 발급됐다는 사실은 별개의 증명이다.

## ID token은 왜 decode가 아니라 verify해야 하는가

### JWT는 형식이고, 신뢰는 검증에서 생긴다

JWT는 보통 점(`.`)으로 구분된 세 부분으로 구성된다.

```text
header.payload.signature
```

`header`와 `payload`는 Base64URL로 표현된 데이터이므로 누구나 decode해 읽을 수 있다. 공격자도 임의의 payload를 만들 수 있다.

예를 들어 다음처럼 보이는 payload가 있다고 해서 Google이 발급했다는 뜻은 아니다.

```json
{
  "sub": "attacker-selected-value",
  "email": "owner@example.com",
  "email_verified": true
}
```

이 데이터가 신뢰할 수 있으려면 최소한 다음을 확인해야 한다.

1. Google의 private key로 만들어진 서명인가?
2. Google이라는 올바른 issuer가 발급했는가?
3. Chaek의 client ID를 audience로 발급했는가?
4. 허용한 서명 algorithm을 사용했는가?
5. 아직 유효한 시간 범위인가?
6. 현재 로그인 시도의 nonce와 일치하는가?
7. Chaek이 요구하는 identity claim이 올바른 type과 값으로 존재하는가?

decode는 “내용을 읽는다”이고 verify는 “그 내용을 누가 어떤 조건으로 보증했는지 확인한다”이다.

### 공개키 검증은 왜 가능한가

Google은 private key로 ID token에 서명하고, 검증에 필요한 public key들을 JWKS endpoint로 공개한다.

```text
Google private key
    └── ID token signature 생성

Google public key in JWKS
    └── Chaek이 signature 검증
```

public key로는 Google의 새 서명을 만들 수 없고, Google이 만든 서명이 맞는지만 확인할 수 있다.

Google은 key를 교체할 수 있으므로 Chaek 코드에 public key 하나를 영구 복사하지 않는다. `jose`의 `createRemoteJWKSet()`이 JWKS endpoint에서 현재 key set을 가져오고, JWT header의 `kid`에 맞는 key를 선택할 수 있게 한다.

### signature만 맞으면 충분하지 않은 이유

Google이 진짜 서명한 token이라도 Chaek을 위한 token이 아닐 수 있고, 이미 만료됐을 수 있다.

| 검증 항목 | 질문 | 없으면 생기는 문제 |
| --- | --- | --- |
| algorithm | Chaek이 허용한 `RS256`인가? | 예상하지 않은 알고리즘 처리 |
| signature | Google의 private key로 서명됐는가? | 공격자가 만든 payload 수용 |
| `iss` | 발급자가 허용한 Google issuer인가? | 다른 발급자의 token 수용 |
| `aud` | 이 token의 대상이 Chaek client인가? | 다른 앱을 위해 발급된 token 수용 |
| `azp` | 명시된 authorized party가 Chaek인가? | 여러 audience 문맥에서 다른 client의 token 혼동 |
| `exp` | 만료 시각 전인가? | 오래된 token 사용 |
| `nbf` | 사용 가능 시각 이후인가? | 아직 효력이 시작되지 않은 token 사용 |
| `nonce` | 현재 로그인 시도의 값인가? | 다른 로그인 시도의 token 재사용 |
| `sub` | 안정적인 Google subject가 있는가? | 외부 identity를 일관되게 찾지 못함 |
| `email_verified` | Google이 email을 검증했는가? | 검증되지 않은 email을 내부 계정 속성으로 사용 |

`iat`는 발급 시각을 나타내는 claim이다. 현재 Chaek의 핵심 계약은 라이브러리가 처리하는 표준 시간 검증과 명시된 claim 검증이며, `iat` 자체를 내부 사용자 식별자로 사용하지 않는다.

### 왜 `sub`를 identity로 쓰고 email은 profile로 보는가

이메일은 사람이 이해하기 좋은 속성이지만 안정적인 primary identity가 아니다.

- 사용자가 이메일을 변경할 수 있다.
- provider 정책에 따라 표기나 alias가 달라질 수 있다.
- 다른 provider의 같은 문자열 email이 같은 외부 identity라는 보장은 없다.
- email 소유권과 특정 Google 계정 identity는 같은 개념이 아니다.

Google의 `sub`는 Google issuer 안에서 해당 사용자를 안정적으로 식별하기 위한 subject다. 따라서 Chaek은 다음 복합 identity를 사용한다.

```text
(provider_id = "google", account_id = ID token의 sub)
```

`sub`만 단독으로 저장하지 않고 `provider_id`와 함께 사용하는 이유는 다른 provider도 자체 subject namespace를 가질 수 있기 때문이다.

### 왜 같은 email을 자동으로 기존 사용자에 연결하지 않는가

다음 두 사실은 같지 않다.

```text
Google이 이번 token의 email을 검증했다.
≠
이 Google identity를 기존 Chaek 계정에 자동 연결해도 된다.
```

자동 연결은 로그인 수단을 추가하는 보안 민감 작업이다. 안전한 계정 연결은 보통 다음 증거를 함께 요구한다.

- 기존 Chaek session으로 이미 로그인돼 있음
- 새 Google identity로 다시 인증함
- 사용자가 연결 의도를 명시적으로 확인함
- 충돌·해제·복구 정책이 정의돼 있음

현재 구현에는 이 전체 절차가 없으므로, 같은 email의 다른 identity를 발견하면 `account_conflict`로 중단한다. 불확실한 경우 자동으로 합치지 않는 fail closed 설계다.

## 왜 Google identity와 Chaek user를 분리하는가

### 외부 로그인 수단과 내부 제품 사용자는 수명이 다르다

Google account는 Chaek 밖에서 관리되는 외부 identity다. 반면 Chaek의 사용자와 그 사용자가 만든 데이터는 Chaek이 관리한다.

둘을 직접 같은 ID로 사용하면 다음 문제가 생긴다.

- 다른 로그인 provider를 추가하기 어렵다.
- Google 연결을 해제할 때 내부 데이터 owner까지 흔들린다.
- 하나의 내부 사용자에 여러 로그인 수단을 연결하기 어렵다.
- provider별 식별자 namespace가 제품 도메인 전체로 퍼진다.

그래서 Chaek은 adapter 역할의 `accounts`를 둔다.

```text
Google identity
provider_id + account_id(sub)
            ↓
accounts.user_id
            ↓
Chaek internal identity
users.id
            ↓
sessions.user_id, ai_jobs.user_id, ...
```

### `accounts`는 사용자 그 자체가 아니라 로그인 방법이다

`users`는 Chaek 제품 안의 사람을 나타낸다. `accounts`는 그 사람이 외부 provider를 통해 자신을 증명할 수 있는 방법을 나타낸다.

현재 로그인 흐름은 기존 사용자에게 다른 Google account를 추가로 연결하는 기능을 제공하지 않는다. 하지만 이 구분을 유지하면 나중에 다음과 같은 명시적 기능을 설계할 수 있다.

- Google 외 provider 추가
- 한 사용자의 복수 로그인 수단
- 로그인 수단 연결·해제
- 특정 provider 장애 시 대체 로그인

데이터 모델이 가능성을 열어 둔 것과 기능이 이미 구현된 것은 다르다. 현재 Chaek에는 명시적인 계정 연결·해제 UI와 복구 절차가 없다.

## Google 로그인 후 왜 Chaek session을 다시 만드는가

### Google ID token과 Chaek session의 책임이 다르다

Google ID token은 Google이 발급한 외부 인증 결과다. Chaek session은 Chaek이 발급한 내부 로그인 상태다.

| 구분 | Google ID token | Chaek session token |
| --- | --- | --- |
| 발급자 | Google | Chaek |
| 주된 목적 | Google identity 증명 | 이후 Chaek 요청 인증 |
| 내용 | 서명된 identity claim | 의미 없는 고엔트로피 무작위 값 |
| 수명 통제 | Google 정책 | Chaek 정책 |
| 즉시 폐기 | Chaek이 Google token 자체를 직접 취소할 수 없음 | DB session 행 삭제로 가능 |
| 현재 저장 | 저장하지 않음 | 원본 cookie, hash DB |

Google token을 그대로 session으로 사용하면 Chaek 로그인 상태가 Google token의 수명과 claim 구조에 묶인다. 로그아웃, 모든 기기 로그아웃, 세션 목록, 강제 폐기 같은 내부 정책도 다루기 어려워진다.

Chaek session을 별도로 만들면 Google은 로그인 순간의 identity provider 역할만 하고, 로그인 이후의 상태 관리는 Chaek이 담당한다.

### opaque session은 무엇이며 왜 선택했는가

Opaque는 “내부 의미를 밖에서 해석할 수 없는 불투명한 값”이라는 뜻이다.

Chaek session token에는 다음 정보가 들어 있지 않다.

- `users.id`
- email
- role
- 만료 시각
- Google `sub`

브라우저가 가진 token은 무작위 문자열일 뿐이다. 서버가 그 hash로 DB를 조회해야 사용자와 만료 시각을 알 수 있다.

```text
Browser cookie raw token
        ↓ SHA-256
sessions.token_hash
        ↓ join
sessions.user_id → users
```

DB 조회가 필요하다는 비용이 있지만 다음 장점이 있다.

- session 행을 삭제해 즉시 로그아웃시킬 수 있다.
- 사용자별 session 목록과 모든 기기 로그아웃으로 확장하기 쉽다.
- cookie 자체에 사용자 정보를 담지 않는다.
- session의 실제 상태를 서버가 한 곳에서 판단한다.

현재 제품 단계에서는 stateless JWT session의 DB 조회 절감보다 폐기 가능성과 이해하기 쉬운 수명주기를 우선한다.

### 원본 session token은 왜 cookie에만 두는가

session token은 그 값을 가진 사람이 로그인 사용자로 취급되는 bearer credential이다. 비밀번호처럼 추가 증명 없이 “소지” 자체가 권한이므로 원본의 노출 범위를 최소화해야 한다.

Chaek은 다음처럼 나눈다.

```text
Browser: raw session token
Database: SHA-256(raw session token)
```

요청이 오면 서버가 cookie 원본을 hash해 DB hash와 비교한다. DB가 유출돼도 hash를 cookie 값으로 그대로 제출할 수 없다.

이 설계가 안전하려면 원본 token의 entropy가 충분히 커야 한다. 짧거나 사람이 정한 token은 hash가 유출됐을 때 무차별 대입으로 복원될 수 있다. Chaek은 `randomBytes(32)`로 만든 고엔트로피 값을 사용한다.

### hash는 encryption과 어떻게 다른가

Encryption은 key를 사용해 원문으로 되돌릴 수 있게 암호화한다. Hash는 일반적으로 원문으로 되돌리는 기능이 없는 단방향 변환이다.

Chaek은 session 조회에 원본 복원이 필요하지 않다. 요청으로 받은 token을 다시 hash해 같은 값인지 확인하면 되므로 encryption보다 hash가 목적에 맞다.

Google API refresh token처럼 나중에 원본을 다시 provider에 보내야 하는 값은 hash만 저장할 수 없다. 그런 기능을 추가한다면 별도의 encryption과 key rotation 정책이 필요하다.

### session token hash에 왜 일반 비밀번호 hash를 쓰지 않는가

사용자 비밀번호는 사람이 만들기 때문에 entropy가 낮을 수 있어 Argon2, scrypt, bcrypt 같은 느린 password hashing이 필요하다.

Chaek session token은 서버가 32 random byte로 만들기 때문에 추측 가능한 후보 공간이 매우 크다. 따라서 빠른 SHA-256 hash를 DB lookup key로 사용할 수 있다.

이 판단은 “SHA-256이 비밀번호 저장에도 충분하다”는 뜻이 아니다. 입력이 사람이 만든 비밀번호인지, 서버가 만든 고엔트로피 token인지에 따라 요구사항이 다르다.

### 왜 고정 만료를 사용하는가

현재 session은 생성 후 30일이 지나면 끝나는 fixed expiration이다. 요청할 때마다 30일을 다시 연장하는 sliding expiration을 사용하지 않는다.

고정 만료는 다음 질문에 대한 답이 단순하다.

- 이 session은 언제 끝나는가?
- DB와 cookie의 만료가 언제 일치해야 하는가?
- 여러 요청이 동시에 들어올 때 누가 token을 회전하는가?
- 오래 활동한 session을 언제 다시 인증시킬 것인가?

sliding expiration과 token rotation은 사용자 편의를 높일 수 있지만 동시 요청, 이전 token의 유예 기간, 탈취 token의 수명 연장 같은 추가 정책이 필요하다. 현재는 단순하고 예측 가능한 고정 만료를 선택했다.

## cookie 속성은 왜 이렇게 설정하는가

### `HttpOnly`

`HttpOnly` cookie는 브라우저 JavaScript의 `document.cookie`에서 읽을 수 없다. XSS가 발생했을 때 session token을 문자열로 직접 탈취하는 위험을 줄인다.

다만 `HttpOnly`가 XSS 자체를 막는 것은 아니다. 악성 script가 사용자의 브라우저에서 Chaek 요청을 대신 보낼 가능성은 여전히 있으므로 입력 처리, Content Security Policy, 출력 escaping 같은 XSS 방어도 별도로 필요하다.

### `Secure`

`Secure` cookie는 HTTPS 연결에서만 전송된다. 네트워크 구간에서 평문 HTTP로 session token이 노출되는 것을 막는다.

로컬 개발의 `http://localhost`에서는 개발 가능성을 위해 `false`가 될 수 있지만 production의 `AUTH_BASE_URL`은 HTTPS여야 하며 cookie도 `Secure`로 설정된다.

### `SameSite=Lax`

`SameSite`는 다른 site에서 시작된 요청에 cookie를 보낼지 결정한다.

Google 로그인 callback은 Google에서 Chaek으로 돌아오는 cross-site top-level navigation이며 현재 `GET`을 사용한다. `Lax`는 이런 정상적인 최상위 안전 메서드 이동에서 cookie가 전달될 수 있게 하면서, 많은 cross-site subrequest나 상태 변경 요청에는 cookie 전송을 제한한다.

따라서 OAuth state cookie가 callback에 도착할 수 있으면서 기본적인 CSRF 노출도 줄이는 절충이다.

### `Path`

OAuth state cookie의 path는 `/api/auth/google`이다. 이 cookie는 로그인 시작과 callback 경로에는 필요하지만 다른 Chaek 페이지에는 필요하지 않다. 좁은 path는 불필요한 요청에 임시 state를 보내지 않게 한다.

Chaek session cookie는 앱 전체의 인증에 필요하므로 path가 `/`다.

### `Max-Age`와 `Expires`

cookie는 브라우저에서도 수명을 가져야 한다. DB 행만 만료시키고 cookie를 오래 남기면 사용자는 의미 없는 token을 계속 보낼 수 있다.

Chaek은 OAuth state cookie와 session cookie에 각각 서버 상태와 맞는 수명을 설정하고, callback 완료나 로그아웃 때 만료 값을 내려 브라우저에서도 제거한다.

## redirect와 URL 검증은 왜 엄격해야 하는가

### `redirect_uri`는 Google과 Chaek 사이의 등록 계약이다

Google은 authorization 결과를 아무 주소로나 보내지 않는다. Google Cloud Console에 등록된 authorized redirect URI와 요청의 `redirect_uri`가 정확히 맞아야 한다.

이 검사는 공격자가 자신의 callback 주소를 넣어 authorization code를 받는 것을 막는 핵심 경계다.

scheme, host, port, path, trailing slash 중 하나만 달라도 다른 URI가 될 수 있다.

```text
http://localhost:3000/api/auth/google/callback
https://localhost:3000/api/auth/google/callback

서로 다른 URI
```

### OAuth `redirect_uri`와 Chaek `returnTo`는 다르다

두 값은 모두 redirect와 관련돼 혼동하기 쉽다.

| 값 | 누가 검증하는가? | 어디로 이동하는가? | 목적 |
| --- | --- | --- | --- |
| `redirect_uri` | Google | Google → Chaek callback | OAuth 결과를 받을 고정 주소 |
| `returnTo` | Chaek | Chaek callback 완료 → 앱 내부 페이지 | 로그인 전 사용자가 보던 내부 위치로 복귀 |

`redirect_uri`는 Google Console에 등록된 고정 provider 계약이다. `returnTo`는 Chaek 내부 UX를 위한 값이다.

### `returnTo`가 open redirect가 될 수 있는 이유

공격자가 다음과 같은 URL을 만들 수 있다고 가정한다.

```text
/api/auth/google?returnTo=https://evil.example
```

Chaek이 검증 없이 로그인 후 그 주소로 보내면, 사용자는 정상 Google/Chaek 로그인을 마친 직후 공격자 사이트로 이동한다. 공격자는 이를 phishing 흐름의 신뢰 장치로 악용할 수 있다.

문자열이 `/`로 시작하는지만 검사하는 것도 충분하지 않다. URL parser는 `//evil.example`이나 역슬래시가 섞인 일부 값을 외부 origin으로 해석할 수 있다.

Chaek은 `AUTH_BASE_URL`을 기준으로 URL을 실제 parsing하고, 결과의 `origin`이 정확히 같을 때만 path, query, hash를 보존한다. 핵심은 문자열 모양이 아니라 브라우저와 같은 URL 해석 결과를 검사하는 것이다.

### `AUTH_BASE_URL`이 중요한 이유

`AUTH_BASE_URL`은 다음 판단의 공통 기준이다.

- Google callback URL 생성
- production HTTPS 강제
- `returnTo`의 same-origin 검사
- logout 요청 `Origin` 검사
- 로그인 완료와 오류 redirect의 기준 origin
- cookie의 `Secure` 설정

요청의 `Host` header를 매번 신뢰해 기준 주소를 만들면 외부 입력이 보안 판단에 영향을 줄 수 있다. 명시적인 base URL을 trust anchor로 사용하면 인증 경계를 배포 설정으로 고정할 수 있다.

## 로그아웃은 왜 `POST`이고 `Origin`을 검사하는가

로그아웃은 데이터를 파괴하지 않는 것처럼 보여도 server-side session을 삭제하는 상태 변경이다.

`GET /logout`으로 만들면 image, link prefetch, crawler, 외부 page의 navigation처럼 사용자가 의도하지 않은 요청만으로 로그아웃될 수 있다.

Chaek은 다음 두 조건을 사용한다.

- 상태 변경 의도를 나타내는 `POST`
- 요청이 Chaek origin에서 시작됐는지 확인하는 strict `Origin` 비교

이는 logout CSRF를 줄인다. 로그아웃 시에는 DB session 행과 browser cookie를 모두 제거해야 한다.

| 하나만 제거한 경우 | 결과 |
| --- | --- |
| cookie만 제거 | 현재 브라우저에서는 로그아웃되지만 DB에 유효한 session이 남음 |
| DB 행만 제거 | 서버 인증은 실패하지만 브라우저가 만료 전까지 쓸모없는 token을 계속 전송 |
| 둘 다 제거 | 서버 상태와 브라우저 상태가 함께 종료 |

Google account의 로그인 상태나 Google grant까지 철회하는 것은 별도 작업이다. Chaek logout은 Chaek session의 종료를 뜻한다.

## 인증과 인가는 왜 매번 분리해서 생각해야 하는가

### `requireUser()`가 보장하는 범위

`requireUser()`는 유효한 Chaek session을 찾고 연결된 `users` record를 반환한다.

이 함수가 보장하는 것은 다음 하나다.

> 이 요청에는 현재 유효한 Chaek 사용자 session이 있다.

다음은 보장하지 않는다.

- 이 사용자가 요청한 `ai_jobs.id`의 owner인가?
- 이 사용자가 관리자 기능을 사용할 role을 가졌는가?
- 이 사용자가 다른 사용자의 profile을 수정해도 되는가?

### 안전한 리소스 조회가 owner 조건을 포함해야 하는 이유

먼저 ID로 데이터를 찾고 나중에 owner를 비교하면, 비교를 빠뜨리거나 중간에 민감 정보를 사용하기 쉽다.

가능하면 query 자체에 owner 조건을 포함한다.

```text
위험한 사고방식
ai_jobs.id로 조회 → 나중에 user 확인

권장 사고방식
ai_jobs.id와 ai_jobs.user_id = current user.id를 함께 조건으로 조회
```

이 원칙은 IDOR(Insecure Direct Object Reference) 또는 BOLA(Broken Object Level Authorization) 같은 객체 단위 인가 취약점을 막는 기본 경계다.

### UI에서 숨기는 것은 authorization이 아니다

버튼이나 링크를 숨겨도 공격자는 HTTP 요청을 직접 만들 수 있다. authorization은 반드시 데이터를 읽거나 변경하는 서버 코드에서 검사해야 한다.

UI 제한은 사용자 경험이고, server-side owner/role 검사는 보안 경계다.

## 저장 위치와 수명은 왜 값마다 다른가

값의 저장 위치는 편의가 아니라 “누가 나중에 원본을 필요로 하는가”로 결정한다.

| 값 | 원본이 필요한 주체 | Chaek의 저장 결정 | 이유 |
| --- | --- | --- | --- |
| OAuth `state` | callback browser와 Chaek | browser에 원본, DB에 hash | 같은 브라우저 연결과 서버 일회성 조회를 동시에 수행 |
| PKCE `code_verifier` | Chaek server와 Google token endpoint | 짧게 DB에 원본 | Google에 원본을 다시 보내야 함 |
| OIDC `nonce` | Chaek server와 ID token | 짧게 DB에 원본 | token claim과 정확히 비교해야 함 |
| authorization code | Chaek server | 영구 저장하지 않음 | 즉시 한 번 교환하는 임시 credential |
| Google ID token | Chaek server | 영구 저장하지 않음 | 현재 로그인 identity 검증이 끝나면 불필요 |
| Google access token | Google API | 사용·저장하지 않음 | 현재 Google API 기능이 없음 |
| Chaek session token | browser와 Chaek server | browser에 원본, DB에 hash | 이후 요청 인증과 DB 유출 피해 축소 |

### 짧은 수명과 일회성이 필요한 이유

임시 credential이 노출돼도 사용할 수 있는 시간과 횟수가 작을수록 피해 범위가 줄어든다.

Chaek의 OAuth state는 10분 또는 1회 사용 중 먼저 오는 시점에 끝난다. authorization code도 즉시 교환하고 저장하지 않는다.

session은 반복 사용이 목적이므로 30일 동안 유효하지만 server-side 행을 삭제해 그보다 일찍 종료할 수 있다.

## DB transaction 경계는 왜 짧아야 하는가

Transaction은 여러 DB 변경을 하나의 원자적 작업으로 묶는다. 그러나 Google token endpoint 호출은 외부 네트워크 작업이라 응답 시간이 길거나 실패할 수 있다.

외부 호출을 transaction 안에 넣으면 다음 문제가 생긴다.

- network timeout 동안 DB lock이나 transaction resource가 유지된다.
- 실패 범위가 DB와 외부 시스템 전체로 넓어진다.
- 재시도 시 어느 단계까지 완료됐는지 판단하기 어려워진다.
- 동시 요청 처리량이 낮아질 수 있다.

그래서 Chaek은 외부 호출을 transaction 밖에 두고, DB 안에서 반드시 함께 성공해야 하는 변경만 짧은 transaction으로 묶는다.

```text
Transaction으로 묶는 것
- 신규 users + accounts 생성
- 이전 session 삭제 + 새 session 생성

Transaction으로 묶지 않는 것
- Google token endpoint 호출
- Google JWKS network fetch
- 전체 OAuth callback 처음부터 끝까지
```

전체 callback은 하나의 거대한 transaction이 아니라 실패 가능한 여러 단계의 workflow다. 중간 실패가 발생하면 이미 소비한 일회용 state를 되돌리지 않고 새 로그인을 시작하게 한다.

## 실패 시 왜 자세한 provider 오류를 브라우저에 보여 주지 않는가

내부 오류와 provider 응답을 그대로 노출하면 다음 정보가 새어 나갈 수 있다.

- token endpoint의 상세 응답
- authorization code나 token
- 계정 존재 여부
- DB constraint와 schema
- 배포 환경 설정

Chaek은 사용자에게 제한된 error code만 전달하고, 서버에도 민감한 원본 값 대신 오류 종류를 기록한다.

이 방식은 원인을 숨기기 위한 것이 아니라 관측 대상을 분리하기 위한 것이다.

```text
사용자 화면
다시 로그인해야 하는지, 설정 담당자에게 문의해야 하는지 안내

서버 관측
어느 단계의 어떤 오류 type인지 추적

민감 credential
화면과 일반 로그 모두에 남기지 않음
```

운영 환경에서는 request correlation ID, 성공·실패 비율, 단계별 latency 같은 비민감 metadata를 추가하면 원본 token 없이도 문제를 분석할 수 있다.

## 직접 구현을 선택한 이유와 전환 기준

### 현재 직접 구현이 주는 학습 가치

직접 구현하면 다음 경계를 코드에서 분명히 볼 수 있다.

- provider redirect와 callback
- `state`, PKCE, `nonce`의 차이
- JWT 서명과 claim 검증
- 외부 identity와 내부 user 연결
- session 생성·조회·폐기
- cookie와 DB의 역할 분리
- 인증과 리소스 authorization의 차이

현재 목적에는 이 가시성이 중요하다.

### 직접 구현이 항상 더 좋은 선택은 아니다

인증 범위가 커지면 직접 유지해야 하는 정책도 빠르게 늘어난다.

- 여러 provider
- email/password와 비밀번호 재설정
- magic link
- MFA
- session rotation
- 모든 기기 로그아웃
- 계정 연결·해제·복구
- provider token refresh와 grant 철회
- 보안 권고 추적
- 공격 탐지, rate limiting, 감사 로그

이 범위에서는 Better Auth 같은 검증된 인증 라이브러리의 유지보수 이점이 직접 구현의 학습 이점보다 커질 수 있다.

현재 구조에서 `users`/`accounts`와 Route Handler 바깥의 auth module을 분리한 이유 중 하나도 향후 전환 비용을 낮추기 위해서다.

## 문맥별 용어집

같은 단어가 OAuth, 웹, Chaek 애플리케이션에서 다른 뜻으로 사용되기도 한다. 아래 용어집은 이 프로젝트 문맥에서의 의미를 설명한다.

### 역할과 프로토콜

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| Authentication | 인증 | 요청자가 누구인지 확인하는 과정 |
| Authorization | 인가, 권한 확인 | 인증된 사용자가 특정 데이터나 동작에 접근해도 되는지 판단하는 과정 |
| OAuth 2.0 | 권한 위임 protocol | 사용자를 대신한 API 접근 권한 위임의 기반 protocol |
| OpenID Connect, OIDC | identity protocol | OAuth 2.0 위에서 로그인 identity를 표준화한 계층 |
| Identity | 정체성, 식별 정체 | 시스템이 “같은 사용자”라고 지속적으로 판단하는 기준 |
| Identity Provider, IdP | identity 제공자 | 사용자를 인증하고 identity 정보를 제공하는 Google |
| OpenID Provider, OP | OpenID 제공자 | OIDC 용어로 본 Google |
| Relying Party, RP | identity 증명을 신뢰해 사용하는 앱 | Google의 ID token을 검증해 로그인에 사용하는 Chaek |
| OAuth Client | OAuth 요청을 만드는 애플리케이션 | Google Cloud에 등록된 Chaek 서버 애플리케이션 |
| Confidential Client | secret을 안전하게 보관할 수 있는 client | server-side `GOOGLE_OAUTH_CLIENT_SECRET`을 가진 Chaek |
| Public Client | secret을 안전하게 숨길 수 없는 client | browser-only SPA나 배포된 native app 같은 유형 |
| Authorization Server | 사용자 인증·동의와 token 발급을 담당하는 서버 | Google OAuth/OIDC 서버 |
| Resource Server | access token을 받고 보호 API를 제공하는 서버 | Drive API 같은 Google API. 현재 로그인 흐름에서는 호출하지 않음 |
| End User | 최종 사용자 | Google로 로그인하는 Chaek 사용자 |
| User Agent | 사용자 대신 HTTP navigation을 수행하는 프로그램 | 주로 웹 브라우저 |
| Provider | 외부 인증 제공자 | 현재는 Google |
| Protocol | 통신 규약 | 참여자가 어떤 값을 어떤 순서와 의미로 주고받는지 정한 계약 |
| Flow | protocol의 구체적인 요청 순서 | 현재는 Authorization Code Flow |
| Trust Boundary | 신뢰 경계 | 값이 한 통제 영역에서 다른 영역으로 넘어가며 재검증이 필요한 지점 |
| Defense in Depth | 다층 방어 | 한 장치가 실패해도 다른 장치가 공격을 막도록 여러 방어를 겹치는 원칙 |
| Least Privilege | 최소 권한 | 필요한 scope와 데이터만 요청·보관하는 원칙 |
| Fail Closed | 안전하게 실패 | 검증이 불확실하면 허용하지 않고 로그인을 중단하는 방식 |

### 요청, redirect, endpoint

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| HTTP Request | HTTP 요청 | 브라우저나 Chaek 서버가 다른 endpoint에 보내는 입력 |
| HTTP Response | HTTP 응답 | status, header, body로 구성된 요청 결과 |
| Endpoint | 통신 종단점 | Google authorization/token/JWKS URL 또는 Chaek API URL |
| Route Handler | Next.js HTTP 처리 함수 | `app/**/route.ts`에서 `GET`, `POST` 등을 처리하는 서버 코드 |
| Authorization Endpoint | 인증·동의 시작 endpoint | 브라우저를 보내는 Google 로그인 URL |
| Token Endpoint | code 교환 endpoint | Chaek 서버가 authorization code를 token으로 교환하는 Google URL |
| JWKS Endpoint | 공개키 집합 endpoint | ID token 서명 검증에 사용할 Google public key set URL |
| Callback | 외부 작업 완료 후 돌아오는 요청 | Google이 브라우저를 통해 Chaek에 code와 state를 돌려보내는 요청 |
| Redirect | 다른 URL로 이동하라는 HTTP 응답 | 보통 `Location` header를 가진 3xx 응답 |
| Redirect URI | OAuth 결과를 받을 등록 주소 | `/api/auth/google/callback`의 절대 URL |
| `returnTo` | 로그인 완료 후 돌아갈 내부 위치 | Chaek이 자체 관리하는 same-origin path |
| Query Parameter | URL `?` 뒤의 key-value | callback의 `code`, `state`, `error`, 시작 endpoint의 `returnTo` |
| Origin | scheme + host + port | `https://chaek.example:443`처럼 same-origin 판단의 기준 |
| Scheme | URL 통신 방식 | `http` 또는 `https` |
| Host | URL의 서버 이름 | `localhost`, `chaek.example` |
| Port | 서버 접속 port | 개발 환경의 `3000` 등 |
| Path | origin 뒤의 경로 | `/api/auth/google/callback` |
| Fragment, Hash | URL의 `#` 뒤 부분 | 브라우저 내부 위치 표현. 일반 HTTP 요청에는 전송되지 않음 |
| Front Channel | 브라우저 redirect가 통과하는 구간 | Chaek → Google → Chaek callback |
| Back Channel | 서버 간 직접 통신 구간 | Chaek server → Google token endpoint |
| Same-Origin | 두 URL의 origin이 같음 | 안전한 `returnTo`와 logout Origin의 기준 |
| Status Code | HTTP 상태 코드 | `403`, `303`, `307`처럼 요청 처리 결과를 나타내는 숫자 |
| `303 See Other` | 다른 위치를 `GET`으로 조회하라는 redirect | logout `POST` 완료 후 로그인 화면으로 이동 |
| `307 Temporary Redirect` | method를 유지하는 임시 redirect | Next.js redirect 응답에서 사용될 수 있는 상태 |
| `403 Forbidden` | 요청은 이해했지만 허용하지 않음 | logout의 `Origin`이 신뢰할 수 없을 때 반환 |
| `Content-Type` | body 형식을 설명하는 header | Google token 교환은 `application/x-www-form-urlencoded` 사용 |
| `Cache-Control: no-store` | 응답 저장 금지 지시 | browser와 중간 cache가 인증 응답을 보관하지 않게 함 |
| Fetch `cache: "no-store"` | Next.js/Fetch 응답 재사용 금지 옵션 | token endpoint 응답을 cache하지 않음 |
| Timeout | 제한 시간을 넘긴 작업 중단 | Google token endpoint가 10초 안에 응답하지 않으면 실패 |

### OAuth/OIDC 값과 token

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| Credential | 자격 증명 | 소지하거나 증명하면 특정 identity·권한으로 인정되는 비밀값 |
| Token | 권한이나 상태를 나타내는 문자열 | authorization code, ID token, access token, session token 등을 포괄 |
| Bearer Token | 가진 사람이 사용할 수 있는 token | 별도 proof 없이 소지 자체가 권한이므로 유출 방지가 중요 |
| Authorization Code | 인가 코드, 일회성 교환권 | callback으로 받은 뒤 Google token endpoint에서 즉시 교환 |
| ID Token | identity token | Google이 인증 결과를 claim으로 담아 서명한 JWT |
| Access Token | 접근 token | Google API 호출 권한. 현재 Chaek은 사용하지 않음 |
| Refresh Token | access token 갱신용 token | offline access에 사용. 현재 요청·저장하지 않음 |
| Session Token | 애플리케이션 로그인 token | Chaek이 발급해 이후 Chaek 요청 인증에 사용 |
| Opaque Token | 내용이 해석되지 않는 불투명 token | DB 조회 전에는 identity나 만료를 알 수 없는 Chaek session token |
| Client ID | OAuth client 공개 식별자 | Google이 Chaek client를 구분하는 값. 비밀번호가 아님 |
| Client Secret | OAuth client 비밀값 | Chaek server가 token 교환 때 사용하는 secret |
| Scope | 요청 권한 범위 | 현재 `openid email profile` |
| `openid` | OIDC 사용을 나타내는 scope | ID token을 포함한 identity 흐름을 요청 |
| `email` | email claim 요청 scope | Google email과 검증 여부를 요청 |
| `profile` | 기본 profile scope | name, picture 같은 profile claim을 요청 |
| Grant | 권한을 부여하는 행위나 결과 | 사용자가 client에 허용한 OAuth 권한 |
| `response_type=code` | 원하는 authorization response 종류 | token이 아니라 code를 callback으로 받겠다는 요청 |
| `grant_type=authorization_code` | token 교환 방식 | 받은 code를 token으로 교환한다는 token endpoint 입력 |
| `state` | OAuth 요청 상관관계 값 | 시작 요청, 같은 browser cookie, callback, DB 행을 연결 |
| PKCE | Proof Key for Code Exchange | code를 시작 시점의 verifier와 묶는 확장 |
| `code_verifier` | PKCE 원본 비밀값 | Chaek DB에 짧게 보관하고 code 교환 때 Google에 전송 |
| `code_challenge` | verifier에서 파생한 공개값 | authorization request에 포함 |
| `S256` | PKCE SHA-256 방식 | `BASE64URL(SHA256(code_verifier))`를 challenge로 사용 |
| `nonce` | 한 번 쓰는 무작위 값 | 현재 로그인 시도와 ID token을 연결 |
| Replay | 재생 공격 | 과거 callback, code, token을 다시 제출하는 공격 |
| Token Exchange | token 교환 | authorization code를 ID/access token으로 바꾸는 서버 간 요청 |

### JWT, 서명, claim

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| JWT | JSON Web Token | Google ID token의 직렬화 형식 |
| JOSE | JSON Object Signing and Encryption | JWT 서명·암호 관련 표준군이자 사용 중인 `jose` 라이브러리 이름의 배경 |
| Header | JWT 머리말 | algorithm과 key ID 같은 검증 metadata |
| Payload | JWT 내용 | `sub`, `email`, `iss`, `aud`, `exp` 같은 claim 모음 |
| Signature | 전자서명 | payload가 Google 발급 후 변조되지 않았음을 검증하는 값 |
| Claim | token 안의 진술 | 발급자, 대상, subject, 만료 시각 같은 name-value 정보 |
| Private Key | 비공개키 | Google이 ID token 서명을 만드는 데 사용 |
| Public Key | 공개키 | Chaek이 Google 서명을 검증하는 데 사용 |
| Asymmetric Cryptography | 비대칭키 암호 | 서명용 private key와 검증용 public key가 다른 방식 |
| JWKS | JSON Web Key Set | 검증 가능한 public key들의 표준 JSON 집합 |
| JWK | JSON Web Key | public key 하나를 표현하는 JSON |
| `kid` | Key ID | JWT header와 JWKS key를 연결하는 식별자 |
| `alg` | Algorithm | JWT 서명 algorithm 표시 |
| `RS256` | RSA SHA-256 signature algorithm | Chaek이 Google ID token에 허용한 algorithm |
| `iss` | Issuer claim | token 발급자. 허용된 Google issuer여야 함 |
| `aud` | Audience claim | token 대상. Chaek의 Google client ID여야 함 |
| `azp` | Authorized Party claim | token 사용을 허가받은 client. 존재하면 Chaek client ID여야 함 |
| `sub` | Subject claim | Google issuer 안의 안정적인 사용자 식별자 |
| `exp` | Expiration Time claim | token이 만료되는 시각 |
| `nbf` | Not Before claim | token 사용을 시작할 수 있는 시각 |
| `iat` | Issued At claim | token이 발급된 시각 |
| `email_verified` | email 검증 claim | provider가 해당 email을 검증했는지 표시 |
| Decode | 복호화가 아닌 형식 해석 | Base64URL payload를 읽는 작업. 진위는 보장하지 않음 |
| Verify | 검증 | 서명과 claim 조건을 확인해 신뢰 가능성을 판단하는 작업 |
| Key Rotation | 키 교체 | provider가 서명 key를 주기적으로 바꾸는 운영 |

`iss`라는 이름은 callback query와 ID token claim 두 곳에 나타날 수 있다. callback query의 선택적 `iss`는 어느 issuer가 authorization response를 보냈다고 주장하는지 조기에 확인하는 값이다. ID token 안의 `iss`는 Google의 서명으로 보호되며 token 교환 후 반드시 검증하는 발급자 claim이다. query의 `iss` 확인이 서명된 ID token의 `iss` 검증을 대신하지 않는다.

### 암호와 무작위 값

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| Entropy | 예측 불가능성의 정도 | token을 공격자가 추측하기 어렵게 만드는 핵심 성질 |
| CSPRNG | 암호학적으로 안전한 난수 생성기 | `node:crypto`의 `randomBytes()`가 사용하는 목적 |
| Random Token | 무작위 token | `state`, verifier, `nonce`, session token의 기반 |
| Hash | 단방향 요약 함수 | 원본 `state`와 session token을 DB lookup 값으로 변환 |
| SHA-256 | 256-bit hash algorithm | state hash, session token hash, PKCE challenge에 사용 |
| Preimage Resistance | 역상 저항성 | hash만 보고 현실적으로 원본 입력을 찾기 어려운 성질 |
| Base64URL | URL-safe binary encoding | `+`, `/`, padding 문제를 피하며 bytes를 문자열로 표현 |
| Encryption | 암호화 | key로 원문 복원이 가능한 변환. 현재 session token 저장에는 사용하지 않음 |
| Constant-Time Comparison | 상수 시간 비교 | 어느 위치에서 다른지에 따라 비교 시간이 크게 달라지지 않게 하는 방식 |
| Timing Attack | 시간차 공격 | 비교 시간 차이로 secret 일부를 추론하는 공격 |
| Hashing vs Password Hashing | 일반 hash와 비밀번호 hash의 차이 | 고엔트로피 random token은 SHA-256 lookup, 사용자 비밀번호는 느린 전용 password hash 필요 |

### cookie와 session

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| Cookie | 브라우저가 origin/path 규칙에 따라 저장·전송하는 값 | OAuth state와 Chaek session token 운반 |
| `Set-Cookie` | cookie 설정 응답 header | Route Handler가 browser에 state/session cookie를 저장하도록 지시 |
| `HttpOnly` | JavaScript 읽기 금지 속성 | `document.cookie`를 통한 token 직접 탈취 위험 축소 |
| `Secure` | HTTPS 전송 전용 속성 | production에서 평문 HTTP 전송 차단 |
| `SameSite` | cross-site cookie 전송 정책 | OAuth callback 호환성과 CSRF 방어를 조정 |
| `Path` | cookie가 전송될 URL 범위 | OAuth state는 auth 경로, session은 앱 전체 |
| `Max-Age` | cookie 유효 초 | browser가 cookie를 유지할 기간 |
| `Expires` | cookie 만료 시각 | 과거 시각으로 설정해 cookie 제거 가능 |
| Session | 여러 요청 사이의 로그인 상태 | Chaek DB row와 browser token의 조합 |
| Server-Side Session | 상태를 서버 DB에서 관리하는 session | 요청마다 token hash로 DB를 조회 |
| Stateless Session | 서버 조회 없이 token 자체에서 상태를 읽는 방식 | 현재 Chaek이 선택하지 않은 JWT session 방식 |
| Fixed Expiration | 고정 만료 | 생성 시 정한 30일 시각이 연장되지 않음 |
| Sliding Expiration | 활동 기반 연장 만료 | 요청마다 만료를 미루는 방식. 현재 미구현 |
| Session Rotation | session token 교체 | 이전 token 폐기와 새 token 발급 정책. 현재 로그인 시 기존 browser session을 교체하는 범위만 존재 |
| Session Revocation | session 폐기 | DB 행을 삭제해 token을 더 이상 인정하지 않음 |

### 웹 보안

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| CSRF | Cross-Site Request Forgery, 사이트 간 요청 위조 | 사용자의 cookie가 자동 전송되는 점을 악용해 의도하지 않은 요청을 만들게 하는 공격 |
| Login CSRF | 로그인 요청 위조 | 피해자 browser를 공격자의 계정 session에 연결시키는 공격 |
| Logout CSRF | 로그아웃 요청 위조 | 피해자를 의도치 않게 로그아웃시키는 공격 |
| XSS | Cross-Site Scripting | 공격자 script가 Chaek origin 문맥에서 실행되는 취약점 |
| Authorization Code Interception | authorization code 가로채기 | code를 탈취해 token 교환을 시도하는 공격 |
| Open Redirect | 외부 URL로의 무검증 redirect | 정상 도메인의 신뢰를 이용해 공격자 site로 사용자를 보내는 취약점 |
| IDOR | Insecure Direct Object Reference | 객체 ID만 바꿔 다른 사용자 데이터에 접근하는 취약점 |
| BOLA | Broken Object Level Authorization | API 객체 단위 owner 검사가 빠진 인가 취약점 |
| Attack Surface | 공격 표면 | 외부 입력, token 저장, 로그, redirect 등 공격 가능한 접점 |
| Credential Leakage | 자격 증명 유출 | code, token, secret이 로그·DB·client bundle 등에 노출되는 상황 |
| Phishing | 피싱 | 신뢰할 만한 화면과 redirect를 이용해 사용자를 속이는 공격 |
| Rate Limiting | 요청 속도 제한 | 로그인 시작·callback 남용과 자동화 공격을 줄이는 운영 방어 |

### DB와 동시성

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| Row | 행 | OAuth state 하나, session 하나, user 하나를 나타내는 DB record |
| Primary Key, PK | 기본키 | table 안에서 row를 유일하게 식별 |
| Foreign Key, FK | 외래키 | `sessions.user_id`처럼 다른 table row를 참조 |
| Unique Constraint | 유일성 제약 | 같은 token hash나 외부 account identity의 중복 저장 방지 |
| Index | 색인 | token hash, user ID, 만료 시각 조회 성능 개선 |
| Transaction | 트랜잭션 | 여러 DB 변경을 함께 성공하거나 함께 실패하게 묶는 단위 |
| Atomicity | 원자성 | 작업이 일부만 적용되지 않고 하나처럼 완료되는 성질 |
| `DELETE ... RETURNING` | 삭제 후 행 반환 SQL | OAuth state를 한 번만 소비하며 해당 verifier와 nonce를 얻음 |
| Race Condition | 경쟁 상태 | 동시 요청의 순서에 따라 잘못된 결과가 생기는 문제 |
| Concurrency | 동시성 | 여러 callback이나 session 요청이 겹쳐 실행되는 상황 |
| Cascade Delete | 연쇄 삭제 | user 삭제 시 연결된 account/session도 함께 삭제 |
| Cleanup | 만료 데이터 정리 | 만료된 `oauth_states`, `sessions` row 삭제 |
| Idempotency | 여러 번 실행해도 최종 결과가 같은 성질 | logout 삭제에는 유용하지만 OAuth callback 성공 자체는 일회성으로 설계 |

### Next.js와 서버 구현

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| App Router | Next.js file-system router | `app/` 아래 page와 Route Handler를 구성하는 방식 |
| Server Component | 서버에서 실행되는 React component | server data를 읽을 수 있지만 HTTP callback 자체는 Route Handler가 처리 |
| Client Component | browser에서도 실행되는 React component | secret과 검증 전 token을 전달하면 안 되는 경계 |
| `route.ts` | Route Handler file convention | HTTP method 함수를 export하는 API route file |
| `NextRequest` | Next.js server request object | callback query, request cookie, `Origin` 등을 읽는 데 사용 |
| `NextResponse` | Next.js server response object | redirect와 `Set-Cookie` 응답을 만드는 데 사용 |
| `cookies()` | Next.js 비동기 cookie API | 현재 server request의 Chaek session cookie를 읽는 데 사용 |
| `server-only` | server module 경계 표시 | auth module이 실수로 client bundle에서 import되면 오류가 나게 함 |
| Node.js Runtime | Node.js API를 사용할 수 있는 server runtime | `node:crypto`, DB, `jose`를 사용하는 auth Route에 명시 |
| Environment Variable | 배포 환경 설정값 | client ID, client secret, base URL, DB credential 보관 |
| `NEXT_PUBLIC_` | browser bundle 공개 접두사 | secret에 붙이면 안 됨 |
| Client Bundle | browser로 전송되는 JavaScript | client secret과 server-only token이 포함되면 안 됨 |
| Orchestration | 여러 작은 작업의 순서 조정 | callback Route Handler가 state, 교환, 검증, account, session 함수를 연결 |
| Primitive | 더 큰 보안 동작의 작은 기본 연산 | random token, SHA-256, constant-time comparison |
| Runtime Validation | 실행 시 외부 입력 검증 | token response와 JWT claim의 type·value 확인 |

### 데이터베이스 기술

| Term | 한국어 의미 | Chaek 문맥 |
| --- | --- | --- |
| Turso | 관리형 libSQL database service | OAuth state, user, account, session을 저장하는 현재 DB |
| libSQL | SQLite 계열 database engine/protocol | Chaek이 Turso와 로컬 DB에서 사용하는 기반 |
| Drizzle ORM | TypeScript database toolkit | schema 정의와 type-safe query 작성에 사용 |
| Schema | 데이터 구조 계약 | table, column, type, constraint, relation 정의 |
| Migration | schema 변경 이력 | 기존 DB를 새 `oauth_states`·`sessions` 구조로 순서대로 변경 |
| Join | 여러 table의 관련 row 결합 | session의 `user_id`로 `users` 정보를 함께 조회 |
| Inner Join | 양쪽에 일치 row가 있을 때만 반환하는 join | 유효한 session과 실제 user가 모두 존재해야 인증 결과 반환 |
| Constraint | DB가 강제하는 데이터 규칙 | primary key, foreign key, unique, not-null 등 |

### Chaek 구현 이름

| Name | 의미 |
| --- | --- |
| `oauth_states` | 로그인 시작과 callback 사이의 10분짜리 일회용 서버 상태 table |
| `sessions` | Chaek 자체 로그인 session table |
| `accounts` | 외부 provider identity와 내부 `users.id`를 연결하는 table |
| `users` | Chaek 내부 사용자 table |
| `state_hash` | 원본 OAuth state의 SHA-256 결과 |
| `token_hash` | 원본 Chaek session token의 SHA-256 결과 |
| `provider_id` | 외부 provider 종류. 현재 `"google"` |
| `account_id` | provider 안의 identity ID. Google에서는 ID token의 `sub` |
| `user_id` | Chaek 내부 사용자를 가리키는 foreign key |
| `scope` | Google token endpoint가 반환한 granted scope metadata. 현재 Google API token 권한으로 사용하지 않음 |
| `expires_at` | state나 session을 더 이상 인정하지 않을 시각 |
| `return_to` | OAuth 성공 후 이동할 검증된 Chaek 내부 위치 |
| `getCurrentSession()` | 현재 request cookie를 읽어 유효한 session과 user를 조회 |
| `requireUser()` | session이 없으면 실패하고, 있으면 인증된 user를 반환 |
| `synchronizeGoogleAccount()` | 검증된 Google profile을 `accounts`와 `users`에 연결 |
| `createOauthState()` | state, verifier, nonce를 만들고 임시 DB 상태를 저장 |
| `consumeOauthState()` | browser state를 비교하고 DB state를 일회성 삭제·반환 |
| `exchangeGoogleAuthorizationCode()` | code와 verifier를 Google token endpoint에 교환 |
| `verifyGoogleIdToken()` | Google signature와 Chaek의 claim 계약을 검증 |

## 자주 혼동하는 표현

### “Google에 로그인했다”와 “Chaek에 로그인했다”

- Google에 로그인했다: Google이 사용자를 인증할 수 있는 상태다.
- Chaek에 로그인했다: Chaek이 Google 인증 결과를 검증하고 자체 session을 발급한 상태다.

Google 화면에서 성공했더라도 Chaek의 state, PKCE, ID token, account 동기화, session 발급 중 하나가 실패하면 Chaek 로그인은 완료되지 않는다.

### “token이 유효하다”와 “이 요청을 허용한다”

- token이 유효하다: token의 서명, 수명, 대상 등 token 자체 조건이 맞다.
- 요청을 허용한다: token으로 식별한 사용자가 해당 resource에 필요한 권한도 가진다.

유효한 session token은 authentication의 근거지만 모든 resource authorization의 근거는 아니다.

### “email이 검증됐다”와 “계정을 연결해도 된다”

- email이 검증됐다: Google이 해당 account의 email 속성을 검증했다.
- 계정을 연결해도 된다: Chaek의 기존 사용자와 새 외부 identity를 합칠 충분한 증거와 사용자 의도가 있다.

현재 구현은 두 번째 조건을 자동으로 충족됐다고 보지 않는다.

### “JWT를 읽었다”와 “JWT를 신뢰한다”

- 읽었다: Base64URL payload를 decode했다.
- 신뢰한다: signature, issuer, audience, 시간, nonce와 필요한 claim을 verify했다.

검증 전에 읽은 payload는 외부 입력일 뿐이다.

### “logout”과 “Google 권한 철회”

- Chaek logout: Chaek session 행과 cookie를 제거한다.
- Google logout: Google 자체 browser session을 종료한다.
- OAuth grant revocation: Google API 권한 부여를 철회한다.

현재 Chaek logout은 첫 번째만 수행한다.

### “OAuth state”와 UI state

OAuth의 `state`는 React component state나 애플리케이션 전역 상태와 무관하다. 로그인 시작 요청과 callback을 연결하기 위한 고엔트로피 일회용 보안 값이다.

### “client”와 Client Component

OAuth Client는 Google에 등록된 Chaek 애플리케이션을 뜻한다. Next.js Client Component는 브라우저에서 실행될 수 있는 React component를 뜻한다. 둘은 같은 단어를 쓰지만 다른 개념이다.

### callback query의 `iss`와 ID token의 `iss`

- callback query의 `iss`: authorization response가 어느 issuer에서 왔다고 나타내는 선택적 parameter다.
- ID token의 `iss`: Google이 서명한 token 내부의 issuer claim이다.

Chaek은 둘을 각 위치에서 확인한다. query parameter는 외부 입력이므로 그 자체만으로 Google identity를 증명하지 않으며, 최종 신뢰는 ID token의 signature와 `iss` claim 검증을 포함한 전체 검증에서 생긴다.

## 설계를 읽을 때 사용할 질문

OAuth 코드를 읽다가 이유가 보이지 않으면 각 값과 함수에 다음 질문을 적용하면 된다.

1. 이 값은 누가 생성했는가?
2. 이 값은 누구에게 노출되는가?
3. 이 값을 받은 쪽은 무엇을 검증해야 하는가?
4. 이 값은 어느 로그인 시도와 연결되는가?
5. 이 값은 몇 번 사용할 수 있는가?
6. 언제 만료되는가?
7. 원본을 다시 사용해야 하는가, hash만 있으면 되는가?
8. DB, cookie, URL, log 중 어디에 남는가?
9. 이 검사를 제거하면 가능한 공격이나 오연결은 무엇인가?
10. 이 단계는 authentication인가, authorization인가?

예를 들어 session token에 적용하면 다음과 같이 답할 수 있다.

| 질문 | 답 |
| --- | --- |
| 누가 생성하는가? | Chaek server |
| 누구에게 노출되는가? | browser cookie와 Chaek server |
| 무엇을 검증하는가? | hash와 일치하는 DB session이 존재하고 만료되지 않았는지 |
| 몇 번 사용하는가? | session 수명 동안 반복 |
| 언제 끝나는가? | 30일 고정 만료 또는 logout으로 DB 행 삭제 |
| 원본이 필요한가? | browser는 이후 요청에 원본을 보내야 함. DB는 hash만 필요 |
| 어디에 남는가? | 원본은 HttpOnly cookie, hash는 `sessions.token_hash` |
| 검사를 제거하면? | session 위조, 만료 session 수용, 사용자 오인증 가능 |
| authentication인가? | 그렇다. 별도의 resource authorization은 아직 필요 |

## 이 문서와 구현 문서의 경계

이 문서는 설계 이유와 용어를 설명한다. 다음 내용의 기준은 기존 [`google-oauth-flow.md`](./google-oauth-flow.md)다.

- 정확한 디렉터리와 파일별 책임
- Route 입력과 응답
- 현재 DB schema와 migration
- 실제 runtime 실행 순서
- 환경 변수와 Google Cloud Console 설정
- 현재 구현 검증 범위
- 아직 구현하지 않은 후속 기능

구현이 변경되면 먼저 기존 흐름 문서의 계약과 검증 절을 갱신하고, 그 변경이 설계 원칙이나 용어 의미까지 바꿀 때 이 문서를 함께 갱신한다.

## 참고 자료

- [Chaek Google OAuth 직접 구현 종합 가이드](./google-oauth-flow.md)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OpenID Connect reference](https://developers.google.com/identity/openid-connect/reference)
- [Google OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth 2.0 Authorization Framework, RFC 6749](https://www.rfc-editor.org/rfc/rfc6749)
- [Proof Key for Code Exchange, RFC 7636](https://www.rfc-editor.org/rfc/rfc7636)
- [JSON Web Token, RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP OAuth 2.0 Protocol Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js `cookies()` API](https://nextjs.org/docs/app/api-reference/functions/cookies)
