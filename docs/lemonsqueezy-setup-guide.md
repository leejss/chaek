# Lemon Squeezy 크레딧 시스템 설정 가이드

이 문서는 Bookmaker 프로젝트에서 Lemon Squeezy 기반 크레딧 시스템을 설정하는 방법을 안내합니다.

## 1. Lemon Squeezy 계정 생성 및 설정

### 1.1. Lemon Squeezy 계정 만들기

1. [Lemon Squeezy](https://lemonsqueezy.com)에 접속하여 계정을 생성합니다.
2. 비즈니스 정보를 입력하고 계정을 활성화합니다.
3. 초기에는 테스트 모드로 작업하며, 프로덕션 배포 전에 라이브 모드로 전환합니다.

### 1.2. Store 생성 및 ID 확인

1. Dashboard에서 **Stores** 메뉴로 이동합니다.
2. 새 Store를 생성하거나 기존 Store를 선택합니다.
3. Store 설정 페이지에서 **Store ID**를 확인하고 복사합니다.
   - Store ID는 숫자로 이루어진 고유 식별자입니다 (예: `12345`)

## 2. Products 및 Variants 생성

### 2.1. Product 생성

Lemon Squeezy Dashboard → **Products** → **New Product** 클릭

각 크레딧 패키지별로 Product를 생성합니다:

#### Starter Pack (10 Credits)
- **Name**: Starter Pack - 10 Credits
- **Description**: 10 credits for creating 1 book
- **Price**: $10.00 USD
- **Type**: One-time purchase

#### Popular Pack (50 Credits)
- **Name**: Popular Pack - 50 Credits
- **Description**: 50 credits for creating 5 books
- **Price**: $40.00 USD
- **Type**: One-time purchase

#### Pro Pack (100 Credits)
- **Name**: Pro Pack - 100 Credits
- **Description**: 100 credits for creating 10 books
- **Price**: $70.00 USD
- **Type**: One-time purchase

### 2.2. Variant ID 확인

각 Product를 생성한 후:
1. Product 페이지에서 **Variants** 섹션을 찾습니다.
2. 각 Variant의 ID를 복사합니다 (예: `123456`)
3. 이 ID들을 코드의 `lib/credits/config.ts` 파일에 입력합니다.

```typescript
// lib/credits/config.ts
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "package_10",
    name: "Starter Pack",
    credits: 10,
    priceInCents: 1000,
    variantId: "123456", // 여기에 실제 Variant ID 입력
  },
  // ...
];
```

## 3. API Key 생성

### 3.1. API Key 만들기

1. Lemon Squeezy Dashboard → **Settings** → **API** 메뉴로 이동합니다.
2. **Create API Key** 버튼을 클릭합니다.
3. API Key에 이름을 부여합니다 (예: "Bookmaker Production")
4. 생성된 API Key를 복사합니다.
   - API Key는 `lmsq_api_` 접두사로 시작합니다.

⚠️ **주의**: API Key는 한 번만 표시되므로 안전한 곳에 저장하세요!

## 4. Webhook 설정

### 4.1. Webhook 엔드포인트 등록

1. Lemon Squeezy Dashboard → **Settings** → **Webhooks** → **Create Webhook** 클릭
2. **Endpoint URL** 입력:
   - 테스트: `https://your-dev-domain.com/api/credits/webhook`
   - 프로덕션: `https://your-production-domain.com/api/credits/webhook`

### 4.2. 이벤트 선택

다음 이벤트를 선택합니다:
- ✅ `order_created` - 결제 완료 시
- ✅ `order_refunded` - 환불 처리 시

### 4.3. Webhook Secret 생성

1. **Signing Secret** 섹션에서 원하는 Secret 문자열을 입력합니다.
   - 예: 강력한 랜덤 문자열 (최소 32자)
   - Secret은 webhook 서명 검증에 사용됩니다.
2. Webhook을 저장한 후 Secret을 복사합니다.

⚠️ **보안**: Webhook Secret은 절대로 외부에 노출하지 마세요!

## 5. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하거나 수정합니다:

```env
# Lemon Squeezy API
LEMONSQUEEZY_API_KEY=lmsq_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
LEMONSQUEEZY_STORE_ID=12345

# 기타 환경 변수는 그대로 유지
DATABASE_URL=postgresql://...
DATABASE_DIRECT_URL=postgresql://...
GOOGLE_CLIENT_ID=...
OUR_JWT_SECRET=...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
NODE_ENV=development
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

⚠️ **주의**:
- `LEMONSQUEEZY_API_KEY`는 서버 전용 환경 변수입니다.
- `LEMONSQUEEZY_STORE_ID`는 숫자로 입력합니다 (따옴표 없이).
- Lemon Squeezy는 클라이언트 키가 필요 없습니다.

## 6. 데이터베이스 마이그레이션

데이터베이스 스키마를 업데이트합니다:

```bash
# 마이그레이션 파일 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate
```

또는 개발 환경에서는:

```bash
npm run db:push
```

## 7. Webhook 로컬 테스트 (선택사항)

로컬 개발 환경에서 Webhook을 테스트하려면 ngrok과 같은 터널링 도구를 사용합니다:

### 7.1. ngrok 설치 및 실행

```bash
# macOS
brew install ngrok

# ngrok 실행
ngrok http 3000
```

### 7.2. Webhook URL 업데이트

1. ngrok이 제공하는 HTTPS URL을 복사합니다 (예: `https://abc123.ngrok.io`)
2. Lemon Squeezy Dashboard에서 Webhook URL을 업데이트합니다:
   - `https://abc123.ngrok.io/api/credits/webhook`

### 7.3. 테스트 결제 진행

1. 로컬 개발 서버를 실행합니다: `npm run dev`
2. 크레딧 구매 페이지로 이동합니다.
3. 테스트 모드에서 결제를 진행합니다.
4. Webhook 이벤트가 로컬 서버로 전달되는지 확인합니다.

## 8. 프로덕션 배포 체크리스트

프로덕션으로 배포하기 전:

- [ ] Lemon Squeezy 계정을 라이브 모드로 전환
- [ ] 라이브 모드 API Key로 환경 변수 업데이트
- [ ] 라이브 모드 Store ID 확인 및 업데이트
- [ ] 라이브 모드 Variant ID 확인 및 코드 업데이트
- [ ] 프로덕션 도메인으로 Webhook 엔드포인트 등록
- [ ] Webhook Secret이 안전하게 설정되었는지 확인
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 결제 테스트 진행 (소액 결제로 전체 플로우 확인)
- [ ] Dashboard에서 환불 테스트
- [ ] SSL/HTTPS 설정 확인

## 9. 테스트 결제

Lemon Squeezy 테스트 모드에서는:
- 실제 결제가 발생하지 않습니다.
- 테스트 카드 정보를 사용할 수 있습니다.
- Dashboard에서 "Test Mode" 배지를 확인하세요.

테스트 카드 정보:
- **카드 번호**: `4242 4242 4242 4242`
- **만료일**: 미래의 아무 날짜
- **CVV**: 아무 3자리 숫자
- **우편번호**: 아무 숫자

## 10. 환불 처리

Lemon Squeezy에서는 환불을 Dashboard에서 수동으로 처리합니다:

1. Lemon Squeezy Dashboard → **Orders** 메뉴로 이동
2. 환불할 주문을 찾아 클릭
3. **Refund** 버튼 클릭
4. 환불 금액 확인 후 **Confirm Refund**
5. 자동으로 `order_refunded` webhook 이벤트가 전송됩니다.
6. 애플리케이션에서 크레딧이 자동으로 차감됩니다.

⚠️ **참고**: Lemon Squeezy는 프로그래밍 방식의 환불 API를 제공하지 않습니다.

## 11. 크레딧 패키지 가격 변경

가격을 변경하려면:

1. Lemon Squeezy Dashboard에서 Product 가격을 수정합니다.
2. 코드의 `lib/credits/config.ts`에서 `priceInCents` 값을 업데이트합니다.
3. 프론트엔드 UI도 함께 업데이트합니다.

⚠️ **주의**: Variant ID는 변경하지 않는 것이 좋습니다.

## 12. 문제 해결

### Webhook이 작동하지 않는 경우

1. Lemon Squeezy Dashboard → **Settings** → **Webhooks** → 해당 Webhook 클릭
2. **Recent deliveries**에서 실패한 이벤트 확인
3. 에러 메시지 확인 및 코드 수정
4. **Resend** 버튼으로 이벤트 재전송

### 결제는 완료되었지만 크레딧이 추가되지 않는 경우

1. 서버 로그 확인: Webhook 수신 여부 확인
2. Lemon Squeezy Dashboard에서 Order 확인
3. Custom data가 올바르게 전달되었는지 확인
4. 데이터베이스에서 `credit_transactions` 테이블 확인
5. 필요시 Webhook을 수동으로 재전송

### API 키 오류

- `LEMONSQUEEZY_API_KEY`가 올바른지 확인
- 테스트/라이브 모드 불일치 여부 확인
- API Key가 만료되지 않았는지 확인
- 환경 변수가 올바르게 로드되는지 확인

### Webhook 서명 검증 실패

- `LEMONSQUEEZY_WEBHOOK_SECRET`이 올바른지 확인
- Dashboard에 설정한 Secret과 일치하는지 확인
- Webhook 요청의 `X-Signature` 헤더가 전달되는지 확인

## 13. 보안 고려사항

- Webhook signature는 항상 검증합니다 (HMAC SHA-256).
- API Key는 절대로 클라이언트 코드에 포함하지 않습니다.
- Webhook Secret은 안전하게 보관하고 정기적으로 변경합니다.
- 크레딧 차감은 서버에서만 처리합니다.
- 환불은 Lemon Squeezy Dashboard를 통해서만 처리합니다.
- HTTPS를 사용하여 모든 통신을 암호화합니다.
- 환경 변수는 `.gitignore`에 포함하여 Git에 커밋하지 않습니다.

## 14. 추가 리소스

- [Lemon Squeezy Documentation](https://docs.lemonsqueezy.com)
- [Lemon Squeezy API Reference](https://docs.lemonsqueezy.com/api)
- [Lemon Squeezy Webhooks Guide](https://docs.lemonsqueezy.com/help/webhooks)
- [Lemon Squeezy Discord Community](https://discord.gg/lemonsqueezy)

## 15. 지원

문제가 발생하면:
1. 이 가이드의 문제 해결 섹션을 확인하세요.
2. Lemon Squeezy Documentation을 참조하세요.
3. Lemon Squeezy Support에 문의하세요.
