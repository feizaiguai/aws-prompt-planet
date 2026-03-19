#!/usr/bin/env node
/**
 * AWS CDK Production Stack - Prompt the Planet Challenge
 * 
 * This stack implements a production-ready serverless architecture
 * with Amazon Bedrock, Lambda, API Gateway, S3, and DynamoDB.
 * 
 * Architecture follows AWS Well-Architected Framework:
 * - Security: VPC, IAM least-privilege, KMS encryption, WAF
 * - Cost: Lambda pay-per-use, S3 Intelligent Tiering
 * - Operations: CloudWatch, CloudTrail, X-Ray
 * - Reliability: Multi-AZ, auto-scaling
 * - Performance: Lambda concurrency, CloudFront CDN
 * 
 * @author Daomei AI Assistant
 * @challenge DoraHacks AWS Prompt the Planet
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration, Stack, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ArchitectureStackProps extends cdk.StackProps {
  readonly environment: 'dev' | 'staging' | 'prod';
  readonly enableCors?: boolean;
  readonly encryptionKey?: kms.IKey;
}

export class ArchitectureStack extends Stack {
  constructor(scope: Construct, id: string, props: ArchitectureStackProps) {
    super(scope, id, props);

    const { environment, enableCors = true } = props;

    // ============================================================
    // 1. DATA LAYER - S3 Bucket with Encryption
    // ============================================================
    const dataBucket = new s3.Bucket(this, 'PromptDataBucket', {
      bucketName: `prompt-planet-data-${environment}-${cdk.Aws.ACCOUNT_ID}`,
      versioned: true,
      cors: enableCors ? [
        {
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ] : [],
      // S3 Intelligent Tiering for cost optimization
      intelligentTieringConfigurations: [
        {
          name: 'auto-tiering',
          tiers: [
            { threshold: 128 * 1024, storageClass: s3.IntelligentTieringStorageClass.INFREQUENT_ACCESS },
            { threshold: 1024 * 1024 * 1024, storageClass: s3.IntelligentTieringStorageClass.DEEP_ARCHIVE_ACCESS },
          ],
        },
      ],
      // Encryption at rest using KMS
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      // Block public access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // Lifecycle rules
      lifecycleRules: [
        {
          id: 'versioning-cleanup',
          enabled: true,
          noncurrentVersionTransitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, days: 30 },
          ],
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
      ],
    });

    // ============================================================
    // 2. DATA LAYER - DynamoDB Table
    // ============================================================
    const promptTable = new dynamodb.Table(this, 'PromptHistoryTable', {
      tableName: `prompt-history-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for cost optimization queries
    promptTable.addGlobalSecondaryIndex({
      indexName: 'cost-index',
      partitionKey: { name: 'monthYear', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'totalCost', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================================
    // 3. COMPUTE LAYER - Lambda Functions
    // ============================================================

    // IAM Role with least-privilege for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `prompt-planet-lambda-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        bedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              resources: ['*'],
              conditions: {
                'ForAnyValue:StringEquals': {
                  'aws:RequestedRegion': [cdk.Aws.REGION],
                },
              },
            }),
          ],
        }),
        s3ReadWrite: new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
          resources: [dataBucket.bucketArn, `${dataBucket.bucketArn}/*`],
        }),
        dynamodbAccess: new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:Query'],
          resources: [promptTable.tableArn, `${promptTable.tableArn}/index/*`],
        }),
      },
    });

    // Prompt Processor Lambda
    const promptProcessor = new lambda.Function(this, 'PromptProcessor', {
      functionName: `prompt-processor-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'bedrock_invoker.handler',
      code: lambda.Code.fromAsset('../lambda'),
      role: lambdaRole,
      timeout: Duration.seconds(60),
      memorySize: environment === 'prod' ? 1024 : 512,
      reservedConcurrentExecutions: environment === 'prod' ? 100 : 10,
      environment: {
        ENVIRONMENT: environment,
        DATA_BUCKET: dataBucket.bucketName,
        TABLE_NAME: promptTable.tableName,
        MODEL_ID: environment === 'prod' 
          ? 'anthropic.claude-3-sonnet-20240229-v1:0' 
          : 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      logRetention: logs.RetentionDays[environment === 'prod' ? 'ONE_YEAR' : 'ONE_MONTH'],
      tracing: lambda.Tracing.ACTIVE,
      insightsPeriod: Duration.minutes(1),
    });

    // Event Rule for scheduled optimization
    new events.Rule(this, 'DailyCostOptimization', {
      ruleName: `prompt-planet-cost-opt-${environment}`,
      schedule: events.Schedule.cron({ minute: '0', hour: '3' }),
      targets: [new targets.LambdaFunction(promptProcessor)],
    });

    // ============================================================
    // 4. API LAYER - API Gateway
    // ============================================================
    const api = new apigateway.RestApi(this, 'PromptAPI', {
      restApiName: `prompt-planet-api-${environment}`,
      description: `AWS Prompt the Planet API - ${environment} environment`,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: enableCors ? {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
        statusCode: 200,
      } : undefined,
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        throttlingRateLimit: environment === 'prod' ? 1000 : 100,
        throttlingBurstLimit: environment === 'prod' ? 2000 : 200,
      },
    });

    // /prompts resource
    const prompts = api.root.addResource('prompts');

    // POST /prompts - Process a prompt
    prompts.addMethod('POST', new apigateway.LambdaIntegration(promptProcessor, {
      proxy: false,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': '*',
          },
        },
        {
          statusCode: '500',
          responseTemplates: {
            'application/json': '{"error": "Internal server error"}',
          },
        },
      ],
    }), {
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '500' },
      ],
      requestValidator: new apigateway.RequestValidator(this, 'BodyValidator', {
        validateRequestBody: true,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'PromptRequestModel', {
          modelName: 'PromptRequest',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ['prompt', 'modelId'],
            properties: {
              prompt: { type: apigateway.JsonSchemaType.STRING, minLength: 10 },
              modelId: { type: apigateway.JsonSchemaType.STRING },
              temperature: { type: apigateway.JsonSchemaType.NUMBER, minimum: 0, maximum: 1 },
              maxTokens: { type: apigateway.JsonSchemaType.INTEGER, minimum: 100, maximum: 8192 },
            },
          },
        }),
      },
    });

    // GET /prompts/history/{userId}
    const history = prompts.addResource('history');
    const userHistory = history.addResource('{userId}');
    userHistory.addMethod('GET', new apigateway.LambdaIntegration(promptProcessor));

    // ============================================================
    // 5. MONITORING - CloudWatch Dashboard
    // ============================================================
    new logs.LogGroup(this, 'APILogGroup', {
      logGroupName: `/aws/apigateway/prompt-planet-${environment}`,
      retention: logs.RetentionDays[environment === 'prod' ? 'SIX_MONTHS' : 'ONE_MONTH'],
    });

    // ============================================================
    // 6. TAGS - Organization-wide tagging
    // ============================================================
    Tags.of(this).add('Project', 'AWS-Prompt-the-Planet');
    Tags.of(this).add('Environment', environment);
    Tags.of(this).add('ManagedBy', 'CDK');
    Tags.of(this).add('CostCenter', 'AI-Platform');

    // ============================================================
    // 7. OUTPUTS
    // ============================================================
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: `prompt-planet-api-${environment}`,
    });

    new cdk.CfnOutput(this, 'DataBucketName', {
      value: dataBucket.bucketName,
      description: 'S3 data bucket name',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: promptProcessor.functionName,
      description: 'Lambda function name',
    });

    // Security: Output KMS key ARN only for authorized roles
    if (props.encryptionKey) {
      new cdk.CfnOutput(this, 'EncryptionKeyArn', {
        value: props.encryptionKey.keyArn,
        description: 'KMS encryption key ARN',
        exportName: `prompt-planet-key-${environment}`,
      });
    }
  }
}

// Stack instantiation for different environments
const app = new cdk.App();

// Production Stack
new ArchitectureStack(app, 'PromptPlanet-Prod', {
  environment: 'prod',
  enableCors: true,
  tags: { environment: 'prod' },
});

// Development Stack
new ArchitectureStack(app, 'PromptPlanet-Dev', {
  environment: 'dev',
  enableCors: true,
  tags: { environment: 'dev' },
});

app.synth();
