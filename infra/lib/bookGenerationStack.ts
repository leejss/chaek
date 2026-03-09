import path from "node:path";
import * as cdk from "aws-cdk-lib";
import { CfnOutput, CfnParameter, Duration, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";

interface BookGenerationStackProps extends StackProps {
  stage: string;
}

export class BookGenerationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BookGenerationStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const nodeEnv = new CfnParameter(this, "nodeEnv", {
      type: "String",
      default: "production",
    });
    const databaseUrl = new CfnParameter(this, "databaseUrl", {
      type: "String",
      noEcho: true,
    });
    const databaseDirectUrl = new CfnParameter(this, "databaseDirectUrl", {
      type: "String",
      noEcho: true,
    });
    const geminiApiKey = new CfnParameter(this, "geminiApiKey", {
      type: "String",
      noEcho: true,
    });
    const anthropicApiKey = new CfnParameter(this, "anthropicApiKey", {
      type: "String",
      noEcho: true,
    });

    const deadLetterQueue = new sqs.Queue(this, "BookGenerationDeadLetterQueue", {
      queueName: `book-generation-dlq-${stage}.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      retentionPeriod: Duration.days(14),
    });

    const queue = new sqs.Queue(this, "BookGenerationQueue", {
      queueName: `book-generation-${stage}.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      visibilityTimeout: Duration.seconds(900),
      receiveMessageWaitTime: Duration.seconds(20),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    const rootDir = path.resolve(__dirname, "../..");
    const workerLogGroup = new logs.LogGroup(this, "BookGenerationWorkerLogGroup", {
      logGroupName: `/aws/lambda/book-generation-worker-${stage}`,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    const worker = new NodejsFunction(this, "BookGenerationWorker", {
      functionName: `book-generation-worker-${stage}`,
      entry: path.join(rootDir, "lambda/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(150),
      logGroup: workerLogGroup,
      depsLockFilePath: path.join(rootDir, "package-lock.json"),
      projectRoot: rootDir,
      bundling: {
        externalModules: ["@aws-sdk/*"],
        target: "node22",
        sourceMap: true,
        tsconfig: path.join(rootDir, "tsconfig.json"),
      },
      environment: {
        NODE_ENV: nodeEnv.valueAsString,
        DATABASE_URL: databaseUrl.valueAsString,
        DATABASE_DIRECT_URL: databaseDirectUrl.valueAsString,
        GEMINI_API_KEY: geminiApiKey.valueAsString,
        ANTHROPIC_API_KEY: anthropicApiKey.valueAsString,
        AWS_SQS_BOOK_GENERATION_QUEUE_URL: queue.queueUrl,
      },
    });

    queue.grantConsumeMessages(worker);
    queue.grantSendMessages(worker);

    worker.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
        reportBatchItemFailures: true,
        maxConcurrency: 5,
      }),
    );

    const producerPolicy = new iam.ManagedPolicy(this, "BookGenerationProducerPolicy", {
      managedPolicyName: `BookGenerationSQSSendPolicy-${stage}`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sqs:SendMessage"],
          resources: [queue.queueArn],
        }),
      ],
    });

    new CfnOutput(this, "BookGenerationQueueUrl", {
      value: queue.queueUrl,
    });
    new CfnOutput(this, "BookGenerationQueueArn", {
      value: queue.queueArn,
    });
    new CfnOutput(this, "BookGenerationWorkerFunctionName", {
      value: worker.functionName,
    });
    new CfnOutput(this, "BookGenerationProducerPolicyArn", {
      value: producerPolicy.managedPolicyArn,
    });
  }
}
