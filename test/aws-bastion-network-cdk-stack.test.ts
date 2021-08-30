import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as NetworkInstance from '../lib/aws-bastion-network-cdk-stack';
import '@aws-cdk/assert/jest';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

let stack: NetworkInstance.AwsBastionNetworkCdkStack;

test('init stack', () => {
  const app = new cdk.App();

  stack = new NetworkInstance.AwsBastionNetworkCdkStack(
    app,
    'MyNetworkTestStack',
    {
      region: 'eu-central-1',
      prefix: 'test',
      existingVpcId: 'test',
      instances: [
        {
          instanceId: 'BastionHost',
          instanceType: 't3.medium',
          keyName: 'BastionHostKeyPair',
          allowedSecurityGroups: []
        },
      ],
      vpcConfig:{
        cidr: "10.100.0.0/17",
        maxAZs: 3,
        isolatedSubnetCidrMask: 23,
        privateSubnetCidrMask: 20,
        publicSubnetCidrMask: 23,
        ssmPrefix: "/bastion/network"
      }
    }
  );
});

test('should have AWS::EC2::VPC resource', () => {
  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    Tags: [
      {
        Key: 'Name',
        Value: 'test-vpc-eu-central-1',
      },
    ],
  });
});

test('should have Private AWS::EC2::Subnet resource', () => {
  expect(stack).toHaveResourceLike('AWS::EC2::Subnet', {
    Tags: [
      {
        Key: 'aws-cdk:subnet-name',
        Value: 'Private',
      }
    ]
  });
});
