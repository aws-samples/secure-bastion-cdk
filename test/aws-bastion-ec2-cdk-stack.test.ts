import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as BastionInstance from '../lib/aws-bastion-ec2-cdk-stack';
import '@aws-cdk/assert/jest';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

jest.mock('../lib/resource-importer', () => {
  return {
    ResourceImporter: jest.fn().mockImplementation(() => {
      return {
        getVpc: (vpcId: string, scope: cdk.Construct) => {
          return new ec2.Vpc(scope, 'vpcId', {
            cidr: '10.0.0.0/16',
          });
        },
        getSecurityGroup(sgId: string, scope: cdk.Construct): ec2.ISecurityGroup {
          const sg = new ec2.SecurityGroup(scope, sgId, {
            vpc: new ec2.Vpc(scope, `vpc-${sgId}`),
            securityGroupName: sgId,
          });

          return sg;
        },
      };
    }),
  };
});

let stack: BastionInstance.AwsBastionEc2CdkStack;

test('init stack', () => {
  const app = new cdk.App();

  stack = new BastionInstance.AwsBastionEc2CdkStack(
    app,
    'MyEc2TestStack',
    {
      env: {
        account: '123',
        region: 'eu-central-1',
      },
    },
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

test('should have AWS::EC2::Instance resource', () => {
  expect(stack).toHaveResourceLike('AWS::EC2::Instance', {
    Tags: [
      {
        Key: 'Name',
        Value: 'BastionHost',
      },
    ],
  });
});

test('should have AWS::IAM::Role resource', () => {
  expect(stack).toHaveResourceLike('AWS::IAM::Role', {});
});

test('should have AWS::EC2::SecurityGroup resource', () => {
  expect(stack).toHaveResourceLike('AWS::EC2::SecurityGroup', {});
});

test('should have AmazonSSMManagedInstanceCore attached to machine role', () => {
  const mp = ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore');

  expect(stack.resolve(mp.managedPolicyArn)).toEqual({
    'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/AmazonSSMManagedInstanceCore']],
  });
});
