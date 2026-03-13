# Supabase Queue 적용 및 검증 순서

이 문서는 현재 프로젝트의 책 생성 백그라운드 작업을 Supabase Queue 기반으로 실제 적용하고 검증할 때, 무엇을 어떤 순서로 해야 하는지 정리한 실행용 체크리스트입니다.

설정 개요만 먼저 보고 싶다면 [`docs/supabase-queues-setup-guide.md`](/Users/tinyyard/project/book-maker/docs/supabase-queues-setup-guide.md)를 참고하세요.

## 0. 먼저 이해할 구조

현재 구조는 아래 순서로 동작합니다.

1. 사용자가 `POST /api/books/{id}/generate` 호출
2. 앱 서버가 `book_generation` 큐에 job enqueue
3. 앱 서버가 Supabase Edge Function `book-generation-dispatcher`를 즉시 호출
4. Edge Function이 앱의 `POST /api/jobs/book-generation/drain` 호출
5. drain 엔드포인트가 큐 메시지 1개를 읽고 책 생성 워커 실행
6. 필요하면 continuation job을 다시 enqueue
7. 즉시 호출이 실패해도 Supabase Cron이 1분마다 dispatcher를 호출해 복구

즉, 실제 무거운 생성은 Next.js Node 런타임에서 돌고, Supabase는 큐와 디스패치 오케스트레이션을 담당합니다.

## 1. 준비물 확인

아래가 준비되어 있어야 합니다.

- Supabase 프로젝트
- Supabase Edge Functions 사용 가능 상태
- Supabase Cron 사용 가능 상태
- 앱 서버가 외부에서 접근 가능한 URL
- Postgres가 Supabase DB이거나, 최소한 `pgmq` extension 사용이 가능한 DB
- Google 로그인/AI 모델 관련 기존 환경변수

로컬에서 먼저 확인할 것:

```bash
npm install
npm run typecheck
```

## 2. 환경변수 준비

앱 서버에 아래 환경변수를 설정합니다.

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

값 설명:

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 앱 서버가 dispatcher function을 즉시 호출할 때 사용하는 키
- `BOOK_GENERATION_JOB_SECRET`: Edge Function이 앱의 drain 엔드포인트를 호출할 때 인증에 쓰는 공유 시크릿
- `APP_URL`: 외부에서 접근 가능한 앱 서버 주소

확인 포인트:

- `APP_URL`은 실제 배포 URL이어야 합니다.
- `BOOK_GENERATION_JOB_SECRET`는 앱 서버와 Edge Function에 동일하게 들어가야 합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용으로만 사용해야 합니다.

## 3. DB에 Queue 준비

큐 초기화 SQL은 [`drizzle/0000_supabase_queues.sql`](/Users/tinyyard/project/book-maker/drizzle/0000_supabase_queues.sql)에 있습니다.

이 SQL이 하는 일:

- `pgmq` extension 생성
- `book_generation` 큐 생성

적용 방법:

```bash
npm run db:migrate
```

직접 DB에서 확인할 것:

- `pgmq` extension이 생성되었는지
- `book_generation` 큐가 생성되었는지

문제가 있으면 확인:

- Supabase Postgres에서 `pgmq` 사용이 가능한지
- migration이 실제 운영 DB에 반영되었는지

## 4. Edge Function 배포

배포 대상 함수:

- [`supabase/functions/book-generation-dispatcher/index.ts`](/Users/tinyyard/project/book-maker/supabase/functions/book-generation-dispatcher/index.ts)

이 함수의 역할:

- 큐를 직접 읽지 않음
- 앱의 `POST /api/jobs/book-generation/drain`를 호출해서 큐 메시지 1개 처리만 트리거함

함수에 필요한 환경변수:

- `APP_URL`
- `BOOK_GENERATION_JOB_SECRET`

배포 후 확인할 것:

- 함수 URL이 생성되었는지
- 함수 호출 시 앱 서버의 drain 엔드포인트에 도달하는지

## 5. Supabase Cron 설정

Cron은 dispatcher function을 1분마다 호출하는 복구용 백스톱입니다.

권장 설정:

- 대상 함수: `book-generation-dispatcher`
- 주기: 매 1분

의미:

- 정상 흐름에서는 앱 서버가 enqueue 직후 dispatcher를 즉시 호출
- 만약 그 호출이 실패하거나 누락되어도 Cron이 다음 주기에 이어서 처리

확인 포인트:

- Cron이 실제 활성화되었는지
- 최근 실행 로그가 남는지
- 실패 시 재호출되는지

## 6. 앱 서버 실행

앱 서버를 실행합니다.

```bash
npm run dev
```

배포 환경이라면 다음이 확인되어야 합니다.

- `APP_URL`로 실제 접근 가능
- `/api/jobs/book-generation/drain`가 외부에서 Edge Function에 의해 호출 가능
- 앱 서버가 DB와 AI provider에 정상 연결됨

## 7. drain 엔드포인트 단독 테스트

전체 생성 테스트 전에 drain 엔드포인트 인증과 기본 동작을 먼저 확인하는 것이 좋습니다.

호출 예시:

```bash
curl -X POST "$APP_URL/api/jobs/book-generation/drain" \
  -H "Authorization: Bearer $BOOK_GENERATION_JOB_SECRET"
```

기대 결과:

- 큐가 비어 있으면 `status: "empty"`
- 다른 프로세스가 같은 책을 잡고 있으면 `status: "locked"`
- 처리 성공 시 `status: "processed"` 또는 `status: "skipped"`
- 실패했지만 재시도 예정이면 `status: "retry_scheduled"`
- 최대 재시도 초과로 archive되면 `status: "archived_after_retries"`

이 단계에서 확인할 것:

- 인증이 정상 통과하는지
- 앱 서버 로그에 drain 호출이 찍히는지

## 8. 실제 책 생성 테스트

### 8-1. 테스트용 책 준비

아래 조건을 만족하는 책이 있어야 합니다.

- `sourceText` 존재
- `tableOfContents` 존재
- `book_generation_states` 존재
- `generationSettings` 유효

### 8-2. 생성 시작 호출

로그인된 상태에서 다음 API를 호출합니다.

```bash
POST /api/books/{bookId}/generate
```

기대 결과:

- `202`
- `status: "queued"`
- `generationVersion` 증가

### 8-3. 직후 확인할 것

DB 또는 상태 API에서 아래를 확인합니다.

- `book_generation_states.status = waiting`
- 큐에 새 메시지가 들어갔는지
- dispatcher 즉시 호출 로그가 있는지

### 8-4. 진행 상태 확인

아래 API를 반복 조회합니다.

```bash
GET /api/books/{bookId}/status
```

보면 되는 값:

- `status`
- `currentChapterIndex`
- `currentSectionIndex`
- `completedChapters`

정상 흐름이면:

- `waiting -> generating -> completed`

### 8-5. 완료 확인

최종적으로 아래를 확인합니다.

- `book_generation_states.status = completed`
- `chapters` 테이블에 각 챕터가 저장됨
- `books.content`가 합쳐져 저장됨

## 9. 장애 시 확인 순서

문제가 생기면 아래 순서대로 봅니다.

### 1. generate API가 실패하는 경우

확인:

- `sourceText`, `tableOfContents` 누락 여부
- `generationSettings` 유효성
- 로그인/권한 문제

관련 코드:

- [`app/api/books/[id]/generate/route.ts`](/Users/tinyyard/project/book-maker/app/api/books/[id]/generate/route.ts)

### 2. 큐에는 들어갔는데 시작이 안 되는 경우

확인:

- dispatcher function이 배포되었는지
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 맞는지
- Cron이 활성화되어 있는지

관련 코드:

- [`lib/ai/queue.ts`](/Users/tinyyard/project/book-maker/lib/ai/queue.ts)

### 3. drain 호출은 되는데 처리되지 않는 경우

확인:

- `BOOK_GENERATION_JOB_SECRET`가 앱과 함수에 동일한지
- DB advisory lock에 막히고 있지 않은지
- 큐 payload가 유효한지

관련 코드:

- [`app/api/jobs/book-generation/drain/route.ts`](/Users/tinyyard/project/book-maker/app/api/jobs/book-generation/drain/route.ts)

### 4. 중간에 실패하는 경우

확인:

- AI provider API 키
- DB 연결
- `book_generation_states.error`
- 큐 메시지의 `read_ct`

최대 3회 이상 실패하면 메시지는 archive됩니다.

### 5. continuation이 이어지지 않는 경우

확인:

- 워커가 continuation enqueue를 했는지
- enqueue 직후 dispatcher 재호출이 실패하지 않았는지
- Cron이 후속 처리하고 있는지

관련 코드:

- [`lib/ai/worker/bookGenerationWorker.ts`](/Users/tinyyard/project/book-maker/lib/ai/worker/bookGenerationWorker.ts)

## 10. 최종 체크리스트

배포 전에 아래를 모두 체크합니다.

- [ ] 앱 서버 env 설정 완료
- [ ] Supabase 함수 env 설정 완료
- [ ] `pgmq` extension 생성 완료
- [ ] `book_generation` 큐 생성 완료
- [ ] Edge Function 배포 완료
- [ ] Cron 설정 완료
- [ ] `POST /api/jobs/book-generation/drain` 수동 호출 성공
- [ ] `POST /api/books/{id}/generate` 호출 성공
- [ ] `GET /api/books/{id}/status`에서 진행 상태 확인
- [ ] 최종 완료 시 `books.content` 저장 확인

## 11. 추천 테스트 순서 한 줄 요약

가장 안전한 순서는 아래입니다.

1. env 설정
2. DB migration 적용
3. Edge Function 배포
4. Cron 설정
5. 앱 서버 실행
6. drain 엔드포인트 수동 호출 테스트
7. 책 생성 API 호출
8. 상태 API와 DB로 완료 확인
