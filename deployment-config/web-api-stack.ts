import * as path from "path";
import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNode from "@aws-cdk/aws-lambda-nodejs";
import * as route53 from "@aws-cdk/aws-route53";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as AWS from "aws-sdk";
import { IHostedZone } from "@aws-cdk/aws-route53";
import {
  APP_NAME,
  DOMAIN,
  AMAZON_ACCOUNT_NUMBER,
  AMAZON_REGION,
  TOKEN_SECRET,
} from "./config";

const API_DOMAIN = `api.${DOMAIN}`;

export class WebApiStack extends cdk.Stack {
  zone: Promise<IHostedZone | null>;
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      env: {
        account: AMAZON_ACCOUNT_NUMBER,
        region: AMAZON_REGION,
      },
    });

    this.zone = this.init();
  }

  async getZone() {
    return await this.zone;
  }

  async init() {
    console.log({ DOMAIN });

    let zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN,
    });

    if (!zone.hostedZoneId || zone.hostedZoneId === "DUMMY") {
      zone = new route53.HostedZone(this, `${APP_NAME}-hosted-zone`, {
        zoneName: DOMAIN,
      });

      console.log(
        "This script will only create the zone. After this is done you need to align the nameserver records with your domain name provider and then run this script again."
      );

      return null;
    }

    const apiCertificate = new acm.DnsValidatedCertificate(
      this,
      `${APP_NAME}-api-certificate`,
      {
        domainName: API_DOMAIN,
        hostedZone: zone,
        region: "eu-west-1",
      }
    );

    const apiCertificateArn = apiCertificate.certificateArn;

    // defines an AWS Lambda resource
    const registerLambda = new lambdaNode.NodejsFunction(
      this,
      `${APP_NAME}-register-user`,
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        timeout: cdk.Duration.seconds(30),
        entry: path.join(__dirname, `../api/lambdas/auth/register.ts`),
        functionName: `${APP_NAME}-register-user`,
        environment: {
          USER_TABLE_NAME: `${APP_NAME}-users-table`,
        },
      }
    );

    const loginLambda = new lambdaNode.NodejsFunction(
      this,
      `${APP_NAME}-login-user`,
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        timeout: cdk.Duration.seconds(30),
        entry: path.join(__dirname, `../api/lambdas/auth/login.ts`),
        functionName: `${APP_NAME}-login-user`,
        environment: {
          USER_TABLE_NAME: `${APP_NAME}-users-table`,
          TOKEN_SECRET: TOKEN_SECRET!,
        },
      }
    );

    const meLambda = new lambdaNode.NodejsFunction(
      this,
      `${APP_NAME}-users-me`,
      {
        memorySize: 1024,
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        timeout: cdk.Duration.seconds(30),
        entry: path.join(__dirname, `../api/lambdas/users/me.ts`),
        functionName: `${APP_NAME}-users-me`,
        environment: {
          USER_TABLE_NAME: `${APP_NAME}-users-table`,
          TOKEN_SECRET: TOKEN_SECRET!,
        },
      }
    );

    // defines an API Gateway REST API resource
    const api = new apigateway.LambdaRestApi(this, `${APP_NAME}-api`, {
      handler: registerLambda,
      proxy: false,
      domainName: {
        domainName: API_DOMAIN,
        certificate: apiCertificate,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: [
          "GET",
          "HEAD",
          "OPTIONS",
          "PUT",
          "POST",
          "PATCH",
          "DELETE",
        ],
      },
    });

    //Create A Record Custom Domain to CloudFront CDN
    new route53.ARecord(this, `${APP_NAME}-A-record`, {
      recordName: API_DOMAIN,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
      zone,
    });

    let usersTable: dynamodb.Table;
    try {
      const table = await new AWS.DynamoDB()
        .describeTable({
          TableName: `${APP_NAME}-users-table`,
        })
        .promise();

      usersTable = dynamodb.Table.fromTableArn(
        this,
        `${APP_NAME}-users-table`,
        table.Table?.TableArn!
      ) as dynamodb.Table;
    } catch (err) {
      if (err.code === "ResourceNotFoundException") {
        usersTable = new dynamodb.Table(this, `${APP_NAME}-users-table`, {
          partitionKey: { name: "hk", type: dynamodb.AttributeType.STRING },
          sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
          tableName: `${APP_NAME}-users-table`,
        });
      }
    }
    usersTable!.grantReadWriteData(loginLambda);
    usersTable!.grantReadWriteData(registerLambda);

    /////////////////////////
    //  API DEFINITIONS
    /////////////////////////

    // Auth Endpoints
    const auth = api.root.addResource("auth");

    const login = auth.addResource("login");
    const register = auth.addResource("register");
    login.addMethod("POST", new apigateway.LambdaIntegration(loginLambda));
    register.addMethod(
      "POST",
      new apigateway.LambdaIntegration(registerLambda)
    );

    // User Endpoints
    const user = api.root.addResource("users");

    user
      .addResource("me")
      .addMethod("GET", new apigateway.LambdaIntegration(meLambda));

    return zone;
  }
}
