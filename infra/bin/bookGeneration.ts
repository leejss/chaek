#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BookGenerationStack } from '../lib/bookGenerationStack';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') || 'dev';

new BookGenerationStack(app, `BookGenerationStack-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION
  }
});
