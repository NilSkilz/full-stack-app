#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { WebApiStack } from "./web-api-stack";
import { WebAppStack } from "./web-app-stack";
import { HostedZone } from "@aws-cdk/aws-route53";

const createStack = async () => {
  const app = new cdk.App();
  const apiStack = new WebApiStack(app, "WebApiStack");
  const zone = (await apiStack.getZone()) as HostedZone;
  if (zone) new WebAppStack(app, zone, "WebAppStack");
};

createStack();
