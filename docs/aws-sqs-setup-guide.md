# AWS SQS/Lambda CDK 배포 가이드

이 문서는 `book-maker` 프로젝트의 책 생성 worker 인프라를 AWS CDK로 배포하는 절차를 설명합니다.

현재 저장소 기준으로 배포 대상은 아래와 같습니다.

- FIFO 본 큐: 책 생성 작업 수신
- FIFO DLQ: 반복 실패 메시지 격리
- Lambda worker: SQS 이벤트 소비 및 책 생성 실행
- Event source mapping: SQS → Lambda 연결
- IAM: Lambda consumer 권한, 외부 producer 연결용 managed policy

Next.js 앱 자체 배포는 이번 범위에 포함되지 않습니다.

## 1. 관련 파일

배포 전에 아래 파일을 함께 보면 흐름을 이해하기 쉽습니다.

- `infra/lib/bookGenerationStack.ts`: CDK 스택 정의
- `infra/bin/bookGeneration.ts`: CDK 앱 엔트리포인트
- `lambda/handler.ts`: Lambda 핸들러 엔트리포인트
- `lib/ai/worker/awsBookGenerationHandler.ts`: SQS 배치 처리 로직
- `lib/ai/sqs.ts`: Next.js 서버의 SQS enqueue 로직
- `lib/env.ts`: 앱/worker 환경변수 검증 로직

## 2. 사전 준비

### 로컬 요구사항

아래가 준비되어 있어야 합니다.

- Node.js / npm 사용 가능
- AWS CLI 로그인 완료
- 배포 대상 AWS 계정/리전 접근 권한 보유
- 데이터베이스 URL과 AI API 키 확보

### 의존성 설치

루트와 `infra` 의존성을 각각 설치합니다.

```bash
npm install
npm --prefix infra install
```

### AWS 자격 증명 확인

예시:

```bash
aws sts get-caller-identity
aws configure get region
```

리전은 보통 `ap-northeast-2`를 사용하되, 실제 배포는 현재 셸의 `AWS_REGION` 또는 `CDK_DEFAULT_REGION` 값을 따릅니다.

## 3. 최초 1회 bootstrap

CDK는 계정/리전 조합마다 최초 1회 bootstrap이 필요합니다.

```bash
npm run infra:bootstrap
```

다른 리전으로 배포할 경우, 해당 리전에 대해 다시 bootstrap 해야 합니다.

예시:

```bash
AWS_REGION=ap-northeast-2 npm run infra:bootstrap
```

## 4. stage 규칙

기본 stage는 `dev`입니다.

- `dev`: 개발/검증용
- `prod`: 운영용

stage 값은 리소스 이름에 반영됩니다.

예:

- Queue: `book-generation-dev.fifo`
- Lambda: `book-generation-worker-dev`
- Producer policy: `BookGenerationSQSSendPolicy-dev`

운영 배포 시에는 `-c stage=prod`를 명시적으로 사용하는 것을 권장합니다.

## 5. 배포 입력값

Lambda에 필요한 민감값은 CDK 코드에 저장하지 않습니다. 배포 시 CloudFormation 파라미터로 전달합니다.

| 파라미터 | 실제 환경변수 | 설명 |
|---|---|---|
| `databaseUrl` | `DATABASE_URL` | 앱/worker가 공통으로 사용하는 DB 연결 문자열 |
| `databaseDirectUrl` | `DATABASE_DIRECT_URL` | direct 연결 URL |
| `geminiApiKey` | `GEMINI_API_KEY` | Google AI 호출 키 |
| `anthropicApiKey` | `ANTHROPIC_API_KEY` | Anthropic 호출 키 |
| `nodeEnv` | `NODE_ENV` | 기본값 `production` |

## 6. 배포 전 확인 순서

실제 배포 전에는 아래 순서로 확인하는 것을 권장합니다.

### 1) 타입체크

```bash
npm run typecheck
npm --prefix infra run typecheck
```

### 2) 템플릿 합성 확인

```bash
npm run infra:synth
```

합성 결과에서 아래 항목이 보여야 정상입니다.

- FIFO 본 큐
- FIFO DLQ
- Lambda 함수
- SQS event source mapping
- producer managed policy
- stack outputs

## 7. 배포 명령 예시

### dev 배포

```bash
AWS_REGION=ap-northeast-2 npm --prefix infra run deploy -- \
  --parameters databaseUrl='postgres://...' \
  --parameters databaseDirectUrl='postgres://...' \
  --parameters geminiApiKey='...' \
  --parameters anthropicApiKey='...' \
  --parameters nodeEnv='production'
```

### prod 배포

```bash
AWS_REGION=ap-northeast-2 npm --prefix infra run deploy -- \
  -c stage=prod \
  --parameters databaseUrl='postgres://...' \
  --parameters databaseDirectUrl='postgres://...' \
  --parameters geminiApiKey='...' \
  --parameters anthropicApiKey='...' \
  --parameters nodeEnv='production'
```

루트 편의 스크립트를 쓰고 싶다면 아래처럼 실행할 수 있습니다.

```bash
npm run infra:deploy -- \
  --parameters databaseUrl='postgres://...' \
  --parameters databaseDirectUrl='postgres://...' \
  --parameters geminiApiKey='...' \
  --parameters anthropicApiKey='...' \
  --parameters nodeEnv='production'
```

## 8. 배포 결과로 생성되는 리소스

`infra/lib/bookGenerationStack.ts` 기준으로 아래 리소스가 생성됩니다.

- FIFO queue
  - 이름 예시: `book-generation-dev.fifo`
  - long polling: 20초
  - visibility timeout: 900초
- FIFO dead-letter queue
  - 이름 예시: `book-generation-dlq-dev.fifo`
- Lambda worker
  - 런타임: `nodejs22.x`
  - 아키텍처: `arm64`
  - 메모리: `512MB`
  - timeout: `150초`
- Event source mapping
  - `batchSize: 1`
  - `reportBatchItemFailures: true`
  - `maxConcurrency: 5`
- Producer managed policy
  - `sqs:SendMessage` 최소 권한만 포함

## 9. Stack Outputs 사용법

배포가 끝나면 아래 output을 사용합니다.

| Output | 설명 |
|---|---|
| `BookGenerationQueueUrl` | Next.js 서버의 `AWS_SQS_BOOK_GENERATION_QUEUE_URL` 값 |
| `BookGenerationQueueArn` | 큐 ARN |
| `BookGenerationWorkerFunctionName` | Lambda 함수 이름 |
| `BookGenerationProducerPolicyArn` | producer 주체에 연결할 managed policy ARN |

CDK 출력값은 콘솔이나 CLI 결과에서 확인합니다.

필요하면 아래처럼 조회할 수 있습니다.

```bash
aws cloudformation describe-stacks \
  --stack-name BookGenerationStack-dev \
  --query 'Stacks[0].Outputs'
```

운영 stage면 스택 이름이 `BookGenerationStack-prod`가 됩니다.

## 10. Next.js 서버 연동

Next.js 서버는 최소 아래 환경변수가 필요합니다.

```env
AWS_REGION='ap-northeast-2'
AWS_SQS_BOOK_GENERATION_QUEUE_URL='https://sqs.ap-northeast-2.amazonaws.com/.../book-generation-dev.fifo'
```

현재 서버 코드에서 실제 enqueue는 `lib/ai/sqs.ts`가 담당합니다.

### producer 권한 연결

외부 호스팅 서버가 AWS 밖에서 실행된다면, 현재 배포 주체에 `BookGenerationProducerPolicyArn` 정책을 연결해 `sqs:SendMessage` 권한을 부여해야 합니다.

이번 구성은 다음을 의도합니다.

- CDK는 policy까지만 생성
- IAM User / access key는 자동 생성하지 않음
- 실제 연결 대상은 현재 운영 환경에 맞게 결정

예:

- EC2/ECS role에 정책 연결
- 기존 IAM User에 정책 연결
- CI/CD에서 사용하는 AWS principal에 정책 연결

## 11. Lambda 런타임 계약

Lambda worker는 아래 환경변수만 사용합니다.

- `NODE_ENV`
- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AWS_REGION` (Lambda 런타임이 자동 제공)
- `AWS_SQS_BOOK_GENERATION_QUEUE_URL`

웹 인증 관련 변수는 worker에서 요구하지 않습니다.

즉, `GOOGLE_CLIENT_ID`, `OUR_JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 없이도 worker는 실행됩니다.

## 12. 운영 확인 체크리스트

배포 후 아래 항목을 순서대로 확인합니다.

### 인프라 확인

- SQS 본 큐와 DLQ가 생성되었는지 확인
- Lambda 함수가 생성되었는지 확인
- Lambda trigger에 SQS가 연결되었는지 확인
- Lambda 환경변수가 예상대로 들어갔는지 확인

### 동작 확인

- Next.js 서버에서 책 생성 API 호출 시 큐에 메시지가 들어가는지 확인
- Lambda CloudWatch Logs에 worker 실행 로그가 남는지 확인
- 성공 시 DB 상태가 `waiting` → `generating` → `completed`로 진행되는지 확인
- 실패 시 메시지가 재시도되거나 DLQ로 이동하는지 확인

## 13. 문제 발생 시 점검 포인트

### `cdk synth` 실패

우선 아래를 확인합니다.

- 루트 `npm install` 여부
- `npm --prefix infra install` 여부
- `package-lock.json` 존재 여부
- `lambda/handler.ts` 경로 변경 여부

### Lambda가 큐를 읽지 못함

아래를 확인합니다.

- event source mapping 생성 여부
- Lambda role에 SQS consume 권한이 들어갔는지 확인
- queue URL이 아니라 queue ARN이 trigger 대상으로 연결되었는지 확인

### Next.js 서버가 메시지를 넣지 못함

아래를 확인합니다.

- `AWS_REGION` 값 확인
- `AWS_SQS_BOOK_GENERATION_QUEUE_URL` 값 확인
- producer principal에 `BookGenerationProducerPolicyArn` 연결 여부 확인

### worker가 시작 직후 env 오류 발생

아래를 확인합니다.

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AWS_SQS_BOOK_GENERATION_QUEUE_URL`

## 14. 변경/재배포

인프라 코드나 Lambda 코드를 수정한 뒤에는 아래 순서를 권장합니다.

```bash
npm run typecheck
npm --prefix infra run typecheck
npm run infra:synth
npm run infra:deploy
```

운영 반영 전에는 먼저 `dev` stage에서 검증하는 것을 권장합니다.

## 15. 롤백/정리 참고

- 단순 코드 수정이면 같은 스택에 재배포하면 됩니다.
- stage를 잘못 배포했다면 정확한 stage로 다시 배포합니다.
- 완전 삭제가 필요하면 `cdk destroy`를 사용할 수 있지만, 운영 리소스 삭제이므로 신중히 수행해야 합니다.

예:

```bash
npm --prefix infra run destroy -- -c stage=dev
```

현재 `infra/package.json`에 `destroy` 스크립트는 없으므로 필요하면 일회성으로 `npx cdk destroy` 또는 스크립트 추가 후 사용합니다.
