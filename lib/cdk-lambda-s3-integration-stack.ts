import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
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

    //create a lambda function
    const getPresignUrlFunction = new cdk.aws_lambda.Function(this, 'MyLambdaFunction', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset('lambda'),
      handler: 's3-presign-helper.handler',
      role: s3LambdaRole
    });

    //create rest api with target as lambda
    const s3PresignApi = new apigw.LambdaRestApi(this, 'S3PresignAPI', {
      handler: getPresignUrlFunction,
      proxy: false,
      endpointConfiguration: {
        types: [apigw.EndpointType.REGIONAL]
      },
    });

    const getPresign = s3PresignApi.root.addResource('s3PresigntoGet');
    getPresign.addMethod('GET');
  }
}
