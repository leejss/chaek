# Supabase Queue 설정 가이드

이 프로젝트는 책 생성 백그라운드 작업을 Supabase Queues(`pgmq`)와 Supabase Edge Function으로 처리합니다.

실제 적용과 검증 순서를 따라가려면 [`docs/supabase-queues-runbook.md`](/Users/tinyyard/project/book-maker/docs/supabase-queues-runbook.md)를 먼저 보는 것을 권장합니다.

## 1. 환경변수

앱 서버 환경변수:

```bash
DATABASE_URL=""
DATABASE_DIRECT_URL=""
GOOGLE_CLIENT_ID=""
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
OUR_JWT_SECRET=""
ANTHROPIC_API_KEY=""
GEMINI_API_KEY=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
BOOK_GENERATION_JOB_SECRET=""
APP_URL=""
```

- `SUPABASE_URL`: 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Edge Function 즉시 호출용 서버 키
- `BOOK_GENERATION_JOB_SECRET`: Edge Function -> 앱 drain 엔드포인트 인증용 공유 시크릿
- `APP_URL`: 앱의 공개 베이스 URL

## 2. 큐 초기화

`drizzle/0000_supabase_queues.sql` 를 적용해 `pgmq` 확장과 `book_generation` 큐를 생성합니다.

```bash
npm run db:migrate
```

## 3. Edge Function 배포

Edge Function 경로:

- `supabase/functions/book-generation-dispatcher/index.ts`

필요한 함수 환경변수:

- `APP_URL`
- `BOOK_GENERATION_JOB_SECRET`

이 함수는 앱의 `POST /api/jobs/book-generation/drain` 엔드포인트를 호출해 큐 메시지 1개를 처리하도록 트리거만 담당합니다.

## 4. Cron 설정

Supabase Cron에서 `book-generation-dispatcher` 를 1분 주기로 호출합니다.

- 함수 이름: `book-generation-dispatcher`
- 주기: 매 1분

즉시 디스패치는 앱 서버가 enqueue 직후 직접 호출하고, cron은 복구용 백스톱 역할을 합니다.
