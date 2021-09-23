#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ContextProps } from '../lib/constructs';
import { AwsBastionEc2CdkStack } from '../lib/aws-bastion-ec2-cdk-stack';
import { AwsBastionNetworkCdkStack } from '../lib/aws-bastion-network-cdk-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment');
const context: ContextProps = app.node.tryGetContext(environment);
context.environment = environment;

const account = app.node.tryGetContext('account');

new AwsBastionNetworkCdkStack(
  app,
  'AwsBastion-NetworkCdkStack',
  {
    description: "AwsBastionNetworkCdkStack (qs-1s91omist)"
  },
  context
);

new AwsBastionEc2CdkStack(
  app,
  'AwsBastion-Ec2CdkStack',
  {
    env: {
      account: account,
      region: context.region,
    },
    description: "AwsBastionEc2CdkStack (qs-1s91omj0d)"
  },
  context
);
