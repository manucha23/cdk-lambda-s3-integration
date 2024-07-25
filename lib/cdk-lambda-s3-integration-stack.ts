import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkLambdaS3IntegrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //create s3bucket
    const s3Bucket = new cdk.aws_s3.Bucket(this, 'manucha-presign-demo', {
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const s3ReadWritePolicy = new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: [
        's3:ListBucket',
        's3:GetObject',
        's3:PutObject',
      ],
      resources: [
        s3Bucket.bucketArn,
        `${s3Bucket.bucketArn}/*`,
      ],
    });

    const policyDocument = new cdk.aws_iam.PolicyDocument({
      statements: [s3ReadWritePolicy],
    });

    const s3LambdaRole = new cdk.aws_iam.Role(this, 'LambdaRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        's3ReadWriteAccess': policyDocument,
      },
    });
    s3LambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    //create a lambda function
    const getPresignUrlFunction = new lambda.Function(this, 'S3PresignHelper', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset('lambda', {
        exclude: ['**/*.ts', '!**/*.d.ts'],
      }),
      handler: 's3-presign-helper.handler',
      role: s3LambdaRole,
      environment: {
        'S3_BUCKET_NAME': s3Bucket.bucketName,
      }
    });

    //create rest api with target as lambda
    const s3PresignApi = new apigw.LambdaRestApi(this, 'S3PresignAPI', {
      handler: getPresignUrlFunction,
      proxy: false,
      endpointConfiguration: {
        types: [apigw.EndpointType.REGIONAL]
      },
    });

    const methodResponse: apigw.MethodResponse = {
      statusCode: "200", 
      responseModels: {"application/json": apigw.Model.EMPTY_MODEL}
    }
    
    const integrationResponse: apigw.IntegrationResponse = {
      statusCode: "200",
      contentHandling: apigw.ContentHandling.CONVERT_TO_TEXT
    }

    const requestTemplate = {
      "key" : "$input.params('filename')"
    }

    const getPresinedUrlGet = new apigw.LambdaIntegration(getPresignUrlFunction, {
      allowTestInvoke: true,
      proxy: false,
      integrationResponses: [integrationResponse],
      passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: { "application/json": JSON.stringify(requestTemplate) },
    });
    
    s3PresignApi.root.addMethod('GET', getPresinedUrlGet, {methodResponses: [methodResponse],
      requestParameters: {
        "method.request.querystring.filename": true
      }
     });

  }
}
