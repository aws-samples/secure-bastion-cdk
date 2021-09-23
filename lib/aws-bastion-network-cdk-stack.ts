import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import { ContextProps } from './constructs';

export class AwsBastionNetworkCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps, context: ContextProps) {
    super(scope, id, props);

    
    const projectPrefix = context.prefix;
    const ssmPrefix= context.vpcConfig?.ssmPrefix;
    const vpc = new ec2.Vpc(this, 'VPC', {
      cidr: context.vpcConfig?.cidr,
      maxAzs: context.vpcConfig?.maxAZs,
      subnetConfiguration: [
        {
          cidrMask: context.vpcConfig?.isolatedSubnetCidrMask,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
        {
          cidrMask: context.vpcConfig?.privateSubnetCidrMask,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: context.vpcConfig?.publicSubnetCidrMask,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    cdk.Tags.of(vpc).add('Name', `${projectPrefix}-vpc-${context.region}`);

    // Adding custom NACL for isolated subnets to only allow to/from private subnets
    const nacl = new ec2.NetworkAcl(this, 'NACL', {
      vpc,
      networkAclName: 'IsolatedSubnetNACL',
      subnetSelection: vpc.selectSubnets({
        subnetType: ec2.SubnetType.ISOLATED,
      }),
    });

    cdk.Tags.of(nacl).add('Name', `isolated-${context.region}`);

    const privateSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE,
    });

    const publicSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    });

    const isolatedSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.ISOLATED,
    });

    privateSubnets.subnets.forEach((subnet, index) => {
      nacl.addEntry(`PrivateSubnet${index}Ingress`, {
        cidr: ec2.AclCidr.ipv4(subnet.ipv4CidrBlock),
        direction: ec2.TrafficDirection.INGRESS,
        ruleNumber: 100 + index,
        traffic: ec2.AclTraffic.allTraffic(),
      });

      nacl.addEntry(`PrivateSubnet${index}Egress`, {
        cidr: ec2.AclCidr.ipv4(subnet.ipv4CidrBlock),
        direction: ec2.TrafficDirection.EGRESS,
        ruleNumber: 100 + index,
        traffic: ec2.AclTraffic.allTraffic(),
      });

      cdk.Tags.of(subnet).add('Name', `private-subnet-${subnet.availabilityZone}`);
    });

    publicSubnets.subnets.forEach(subnet => {
      cdk.Tags.of(subnet).add('Name', `public-subnet-${subnet.availabilityZone}`);
    });

    isolatedSubnets.subnets.forEach(subnet => {
      cdk.Tags.of(subnet).add('Name', `isolated-subnet-${subnet.availabilityZone}`);
    });
    // Generating outputs
    new cdk.CfnOutput(this, 'VpcId', {
      description: 'VPC ID',
      exportName: `${projectPrefix}-vpc-id`,
      value: vpc.vpcId,
    });

    new ssm.StringParameter(this, 'ssmVpcId', {
      parameterName: `${ssmPrefix}/vpc/vpc-id`,
      stringValue: vpc.vpcId,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      description: 'VPC CIDR',
      exportName: `${projectPrefix}-vpc-cidr`,
      value: vpc.vpcCidrBlock,
    });

    new ssm.StringParameter(this, 'ssmVpcCidr', {
      parameterName: `${ssmPrefix}/vpc/vpc-cidr`,
      stringValue: vpc.vpcCidrBlock,
    });

    privateSubnets.subnets.forEach((subnet, index) => {
      new ssm.StringParameter(this, `ssmPrivateSubnetId-${index}`, {
        parameterName: `${ssmPrefix}/vpc/subnet/private/${subnet.availabilityZone}/id`,
        stringValue: subnet.subnetId,
        simpleName: false,
      });
    });

    publicSubnets.subnets.forEach((subnet, index) => {
      new ssm.StringParameter(this, `ssmPublicSubnetId-${index}`, {
        parameterName: `${ssmPrefix}/vpc/subnet/public/${subnet.availabilityZone}/id`,
        stringValue: subnet.subnetId,
        simpleName: false,
      });
    });

    isolatedSubnets.subnets.forEach((subnet, index) => {
      new ssm.StringParameter(this, `ssmIsolatedSubnetId-${index}`, {
        parameterName: `${ssmPrefix}/vpc/subnet/isolated/${subnet.availabilityZone}/id`,
        stringValue: subnet.subnetId,
        simpleName: false,
      });
    });
  }
}

