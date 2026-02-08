# AWS SQS 인프라 셋팅 가이드

book-maker 프로젝트의 책 생성 작업 큐를 위한 AWS SQS FIFO Queue 설정 가이드.

---

## 1. SQS FIFO Queue 생성

1. AWS Console → **Amazon SQS** → **Create queue**
2. 아래 설정 적용:

| 항목 | 값 | 비고 |
|------|-----|------|
| **Type** | FIFO | 반드시 FIFO 선택 |
| **Name** | `book-generation.fifo` | FIFO 큐는 `.fifo` 접미사 필수 |
| **Content-based deduplication** | Disabled | 코드에서 `MessageDeduplicationId`를 직접 지정 |
| **Deduplication scope** | Queue | |
| **FIFO throughput limit** | Per queue (기본값) | 트래픽 증가 시 High throughput 모드 전환 |
| **Visibility timeout** | `900` (15분) | Lambda 함수 timeout보다 6배 이상 권장 |
| **Message retention period** | `345600` (4일) | 기본값 사용 |
| **Receive message wait time** | `20` (초) | Long polling 활성화 |

3. **Create queue** 클릭
4. 생성 후 나오는 **Queue URL**을 복사 (예: `https://sqs.ap-northeast-2.amazonaws.com/123456789012/book-generation.fifo`)

---

## 2. IAM 정책 생성

### 2-1. Next.js 서버용 (SQS 메시지 전송)

1. AWS Console → **IAM** → **Policies** → **Create policy**
2. JSON 편집기에서 입력:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:<REGION>:<ACCOUNT_ID>:book-generation.fifo"
    }
  ]
}
```

3. 이름: `BookGenerationSQSSendPolicy`

### 2-2. Lambda Worker용 (SQS 메시지 수신 + 처리)

1. 동일하게 새 정책 생성:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:<REGION>:<ACCOUNT_ID>:book-generation.fifo"
    }
  ]
}
```

2. 이름: `BookGenerationSQSConsumePolicy`

---

## 3. IAM User 생성 (Next.js 서버용)

> Lambda에서 IAM Role로 실행하는 경우 이 단계는 Lambda에만 해당. Next.js가 EC2/ECS에서 실행되면 Instance Role 사용 가능.

1. AWS Console → **IAM** → **Users** → **Create user**
2. 이름: `book-maker-server`
3. **Attach policies directly** → `BookGenerationSQSSendPolicy` 연결
4. **Security credentials** 탭 → **Create access key**
5. Use case: **Application running outside AWS** 선택
6. `Access key ID`와 `Secret access key`를 복사

---

## 4. Lambda 함수 설정

### 4-1. IAM 실행 역할(Execution Role) 생성

Lambda 함수가 사용할 IAM Role을 먼저 생성한다.

1. AWS Console → **IAM** → **Roles** → **Create role**
2. **Trusted entity type**: AWS service
3. **Use case**: Lambda → **Next**
4. 아래 정책들을 연결:
   - `AWSLambdaBasicExecutionRole` (AWS 관리형 — CloudWatch Logs 접근)
   - `BookGenerationSQSConsumePolicy` (2-2에서 생성한 정책)
5. **Role name**: `book-generation-lambda-role`
6. **Create role**

### 4-2. Lambda 함수 생성

1. AWS Console → **Lambda** → **Create function**
2. **Author from scratch** 선택
3. 기본 설정:

| 항목 | 값 |
|------|-----|
| **Function name** | `book-generation-worker` |
| **Runtime** | Node.js 22.x |
| **Architecture** | arm64 (Graviton2, 비용 효율적) |
| **Execution role** | 기존 역할 사용 → `book-generation-lambda-role` 선택 |

4. **Create function** 클릭

### 4-3. 함수 구성 변경

함수 생성 후 **Configuration** 탭에서 아래 설정을 변경한다.

#### General configuration

| 항목 | 값 | 비고 |
|------|-----|------|
| **Memory** | `512` MB | AI SDK 호출 + DB 연결에 충분한 메모리 |
| **Timeout** | `2분 30초` (150초) | 챕터 1개 생성에 필요한 시간. 최대 15분까지 가능 |
| **Ephemeral storage** | `512` MB (기본값) | |

#### Environment variables

**Configuration** → **Environment variables** → **Edit**:

| Key | Value | 비고 |
|-----|-------|------|
| `DATABASE_URL` | `postgres://...` | Supabase pooler URL |
| `DATABASE_DIRECT_URL` | `postgres://...` | Supabase direct URL |
| `GEMINI_API_KEY` | `...` | AI 모델 호출용 |
| `ANTHROPIC_API_KEY` | `...` | AI 모델 호출용 |
| `AWS_SQS_BOOK_GENERATION_QUEUE_URL` | `https://sqs.ap-northeast-2.amazonaws.com/...` | worker에서 continue job 재enqueue 시 필요 |
| `NODE_ENV` | `production` | |

> Lambda는 이미 IAM Role 기반으로 AWS credential이 자동 주입되므로 `AWS_ACCESS_KEY_ID` 등은 설정하지 않는다.

### 4-4. 핸들러 엔트리포인트 작성

Lambda는 특정 형식의 handler 함수를 export해야 한다. 프로젝트 루트에 Lambda 전용 엔트리포인트 파일을 생성:

```typescript
// lambda/handler.ts
import { handleBookGenerationSQSEvent } from "@/lib/ai/worker/awsBookGenerationHandler";

export const handler = handleBookGenerationSQSEvent;
```

### 4-5. 번들링 및 배포

Lambda에 업로드할 zip 파일을 생성한다. `@/` 경로 별칭과 TypeScript를 사용하므로 **esbuild**로 번들링이 필요하다.

#### 방법 A: esbuild로 수동 번들링

```bash
# 1. esbuild 설치 (devDependencies에 없다면)
npm install -D esbuild

# 2. 번들 생성
npx esbuild lambda/handler.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --outfile=dist/lambda/handler.mjs \
  --format=esm \
  --external:@aws-sdk/* \
  --tsconfig=tsconfig.json

# 3. zip 생성
cd dist/lambda && zip -r ../../lambda.zip . && cd ../..
```

> `--external:@aws-sdk/*`: Lambda 런타임에 AWS SDK v3가 내장되어 있으므로 번들에서 제외.

#### 방법 B: npm script 추가 (권장)

`package.json`에 배포 스크립트를 추가:

```json
{
  "scripts": {
    "lambda:build": "esbuild lambda/handler.ts --bundle --platform=node --target=node22 --outfile=dist/lambda/handler.mjs --format=esm --external:@aws-sdk/* --tsconfig=tsconfig.json",
    "lambda:package": "cd dist/lambda && zip -r ../../lambda.zip ."
  }
}
```

#### 업로드

1. Lambda 함수 페이지 → **Code** 탭
2. **Upload from** → **.zip file**
3. `lambda.zip` 선택 → **Save**
4. **Runtime settings** → **Edit**:
   - **Handler**: `handler.handler`
   - **Runtime**: Node.js 22.x

### 4-6. SQS 트리거 연결

1. Lambda 함수 페이지 → **Function overview** → **Add trigger**
2. **Trigger configuration**: SQS 선택
3. 설정:

| 항목 | 값 | 비고 |
|------|-----|------|
| **SQS queue** | `book-generation.fifo` | 1단계에서 생성한 큐 |
| **Activate trigger** | ✅ | |
| **Batch size** | `1` | 책 생성은 장시간 작업이므로 1건씩 |
| **Batch window** | `0`초 | 메시지 도착 즉시 처리 |
| **Report batch item failures** | ✅ 활성화 | **필수** — 코드가 `batchItemFailures`를 반환 |
| **Maximum concurrency** | `5` | 동시 Lambda 인스턴스 수 제한 (비용/부하 조절) |
| **Scaling configuration** | 기본값 | |

4. **Add** 클릭

### 4-7. 테스트

Lambda 함수 페이지 → **Test** 탭에서 테스트 이벤트 생성:

```json
{
  "Records": [
    {
      "messageId": "test-message-001",
      "body": "{\"bookId\":\"00000000-0000-0000-0000-000000000000\",\"generationVersion\":1,\"trigger\":\"start\"}",
      "attributes": {},
      "messageAttributes": {},
      "md5OfBody": "",
      "eventSource": "aws:sqs",
      "eventSourceARN": "arn:aws:sqs:ap-northeast-2:123456789012:book-generation.fifo",
      "awsRegion": "ap-northeast-2"
    }
  ]
}
```

- 존재하지 않는 bookId로 테스트하면 worker가 `skipped: true`를 반환하며 정상 종료됨
- CloudWatch Logs에서 로그 확인: Lambda 함수 → **Monitor** → **View CloudWatch logs**

---

## 5. 환경변수 설정

### Next.js 서버 (.env)

```env
AWS_REGION="ap-northeast-2"
AWS_SQS_BOOK_GENERATION_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/123456789012/book-generation.fifo"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
```

> `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY`는 AWS SDK가 자동 인식하는 표준 환경변수이므로 `serverEnv` 스키마에 별도 추가 불필요.

### Lambda 함수

Lambda의 환경변수에 DB 접속 정보 등 worker에 필요한 변수를 설정:

```
DATABASE_URL="..."
DATABASE_DIRECT_URL="..."
GEMINI_API_KEY="..."
ANTHROPIC_API_KEY="..."
```

---

## 6. Dead Letter Queue (DLQ) 설정 — 권장

실패한 메시지를 별도 큐로 이동시켜 디버깅에 활용.

1. SQS에서 DLQ용 FIFO 큐 생성: `book-generation-dlq.fifo`
2. 원본 큐(`book-generation.fifo`) → **Edit** → **Dead-letter queue**:
   - **Enabled**: ✅
   - **Queue**: `book-generation-dlq.fifo`
   - **Maximum receives**: `3` (3번 실패 시 DLQ로 이동)
3. **Save**

---

## 7. 확인 체크리스트

- [ ] SQS FIFO 큐가 `.fifo` 접미사로 생성됨
- [ ] Content-based deduplication이 **비활성화**됨
- [ ] Lambda 트리거에서 **Report batch item failures** 활성화됨
- [ ] Next.js 서버에 `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_SQS_BOOK_GENERATION_QUEUE_URL` 설정됨
- [ ] Lambda 실행 역할에 SQS 수신/삭제 권한 부여됨
- [ ] DLQ 연결 완료
- [ ] Lambda timeout이 SQS visibility timeout보다 짧음
