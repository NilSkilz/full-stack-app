import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as route53 from "@aws-cdk/aws-route53";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as deploy from "@aws-cdk/aws-s3-deployment";

const dotenv = require("dotenv");
dotenv.config();

const DOMAIN = process.env.DOMAIN || "example.com";
const APP_NAME = process.env.APP_NAME;
const WEB_APP_DOMAIN = `my.${DOMAIN}`;

export class WebAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, zone: route53.HostedZone, id: string) {
    super(scope, id, {
      env: {
        account: process.env.AMAZON_ACCOUNT_NUMBER,
        region: process.env.AMAZON_REGION,
      },
    });

    // const zone1 = new route53.HostedZone(this, `${APP_NAME}-hosted-zone`, {
    //   zoneName: DOMAIN,
    // });

    // console.log(zone1);

    //Create S3 Bucket for our website
    const siteBucket = new s3.Bucket(this, `${APP_NAME}-webapp`, {
      bucketName: `${APP_NAME}-webapp`,
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //Create Certificate
    const siteCertificateArn = new acm.DnsValidatedCertificate(
      this,
      `${APP_NAME}-site-certificate`,
      {
        domainName: WEB_APP_DOMAIN,
        hostedZone: zone,
        region: "us-east-1",
      }
    ).certificateArn;

    //Create CloudFront Distribution
    const siteDistribution = new cloudfront.CloudFrontWebDistribution(
      this,
      `${APP_NAME}-site-distribution`,
      {
        aliasConfiguration: {
          acmCertRef: siteCertificateArn,
          names: [WEB_APP_DOMAIN],
          securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
        },
        originConfigs: [
          {
            customOriginSource: {
              domainName: siteBucket.bucketWebsiteDomainName,
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
      }
    );

    //Create A Record Custom Domain to CloudFront CDN
    new route53.ARecord(this, `${APP_NAME}-A-record`, {
      recordName: WEB_APP_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(siteDistribution)
      ),
      zone,
    });

    //Deploy site to s3
    new deploy.BucketDeployment(this, `${APP_NAME}-deployment`, {
      sources: [deploy.Source.asset("./react-app/build")],
      destinationBucket: siteBucket,
      distribution: siteDistribution,
      distributionPaths: ["/*"],
    });
  }
}
