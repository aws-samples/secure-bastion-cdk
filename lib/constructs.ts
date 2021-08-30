export type BastionInstanceProps = {
    instanceId: string;
    keyName: string;
    allowConnectionsFromCidr?: string;
    instanceType: string;
    linuxDistribution?: 'AMAZON_LINUX2';
    allowedSecurityGroups?: string[];
  };

  export type VpcProps = {
    ssmPrefix: string;
    cidr: string;
    maxAZs?: number;
    isolatedSubnetCidrMask?: number;
    privateSubnetCidrMask?: number;
    publicSubnetCidrMask?: number;
  };

  export type ContextProps = {
    environment?: string;
    region: string;
    prefix: string;
    existingVpcId: string;
    instances: BastionInstanceProps[];
    vpcConfig?: VpcProps;
  };