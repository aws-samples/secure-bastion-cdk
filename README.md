# Introduction
This project provides high level CDK construct describe how customers would be able to provision secure Bastion Hosts based on AWS best practices across various stages and environments. It provides complete example to show how to provision Bastion Hosts in a private subnet and leverage AWS session manager to provide least-privilege to access private resources which gives ability to open tunnel directly using SSM session manager or using SSH with ability to use port-forwarding. The implementation is extednable and encapsulate various settings which allow the customer to customize based on their business needs.

The requirment comes from several customers who are seeking a secure solution to provide temporary and limited access to resources in private or isolated subnets in AWS environments. For instance, there might be a need to grant access to private RDS instance in a non-production environment to group of developers. Bastion hosts is a known solution for this problem. However, it has some drawbacks, for instance it requires to be hosted in a public subnet in order to allow traffic from outside Amazon Virtual Private Cloud (VPC). This is a big security risk and requires more secure solution that allow access to private resources without compromise security. This project provides a solution with an extendable example to this problem.

The codebase is based on the experience from an engagment project where it provides a suffcient solution to the requirements for AWS customer.

# Pre-requisite
For the deployment, you must have the following:

- An AWS account. If you don’t have an AWS account, sign up at https://aws.amazon.com.
- [AWS Command Line Interface (AWS CLI)](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
- [Session Manager plugin for the AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [Downloading and installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
```
npm install -g aws-cdk
```
 

# Solution Architecture

High level architecture for the solution.

![Secure Bastion Host Architecture](./docs/bastion-architecture.png)

# Installation

- Prepare your local machine:

Create a profile named bastion-cdk

```
  $ aws configure --profile bastion-cdk

```

- Configure your target environments:

You can configure the enviroment you would like to deploy by changing the settings in cdk.json in the respository root directory. A typical environment example as shown below will need the following properties to be created, you can add as many environments as you want, then refer to the target environment confirguration in "cdk deploy -c environment="{environment_name}" as it will be explain in the following point. 

```
"staging_eu": {
      "region": "eu-central-1",
      "prefix": "my-demo",
      "existingVpcId": "",
      "instances": [
        {
          "instanceId": "BastionHost",
          "instanceType": "t3.medium",
          "keyName": "BastionHostKey",
          "allowedSecurityGroups": []
        }
      ],
      "vpcConfig":{
        "cidr": "10.100.0.0/17",
        "maxAZs": 3,
        "isolatedSubnetCidrMask": 23,
        "privateSubnetCidrMask": 20,
        "publicSubnetCidrMask": 23,
        "ssmPrefix": "/core/network"
      }
    }
```

Please note that you can use existing VPC with Private Subnet to provision the Bastion Host on it by setting value for (existingVpcId) properties. However, if you wish to deploy the solution to new VPC you can do so by setting (vpcConfig) properties. Then deploy "AwsBastion-NetworkCdkStack" first to provision the VPC as instructed in "Deploy the solution" setup below. 


You need to choose one approach, you can't use both, if there is any value in "existingVpcId" then it will be used over the second approach of creating new VPC.

In (allowedSecurityGroups) add all the SecurityGroups IDs for private resources that you would like to give the Bastion Host users access to them.

- Deploy the solution:

Deploy the solution using the above configured profile. 

```
 $ npm install  ( compiles and installes necessary dependencies)
 $ npm test     (runs unit tests)
 cdk synth -c environment="<Environment Name from cdk.json File>" -c account="<ACCOUNT TO DEPLOY Bastion>" --profile bastion-cdk

```

If you choose to deploy new VPC to be used for the Bastion Host, then you need to deploy "AwsBastion-NetworkCdkStack" first as follow.

```
cdk deploy -c environment="<Environment Name from cdk.json File>" -c account="<ACCOUNT TO DEPLOY Bastion>" AwsBastion-NetworkCdkStack --profile bastion-cdk 
```

Now you can deploy "AwsBastion-Ec2CdkStack" stack
```
cdk deploy -c environment="<Environment Name from cdk.json File>" -c account="<ACCOUNT TO DEPLOY Bastion>" AwsBastion-Ec2CdkStack --profile bastion-cdk 
```

Note: you might face the following error first time you deploy cdk

```
Error: This stack uses assets, so the toolkit stack must be deployed to the environment
```

The reason for that error is deploying AWS CDK apps into an AWS environment (a combination of an AWS account and region) may require that you provision resources the AWS CDK needs to perform the deployment. These resources include an Amazon S3 bucket for storing files and IAM roles that grant permissions needed to perform deployments. The process of provisioning these initial resources is called bootstrapping. So in order to solve this issue you just need to run the following command to bootstrap cdk in your account. 

```
cdk bootstrap aws://{account_id}/{your_selected_region}
```

# CDK construct Overview
Here we walk through the solution and different area of extension. 

# Test Connection to Bastion host
Here is how to connect to Bastion Host using SSM session manager and SSH to open a tunnel and access private resources on your environments. Please follow the following steps. 


1. You need IAM user which have the following permission attached to it.


```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:StartSession"
            ],
            "Resource": [
                "arn:aws:ec2:*:{account_id}:instance/*"
            ],
            "Condition": {
                "StringLike": {
                    "ssm:resourceTag/Name": [
                        "BastionHost"
                    ]
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeImages",
                "ec2:DescribeTags",
                "ec2:DescribeSnapshots"
            ],
            "Resource": [
                "*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssm:StartSession"
            ],
            "Resource": [
                "arn:aws:ssm:*::document/AWS-StartPortForwardingSession",
                "arn:aws:ssm:*::document/AWS-StartSSHSession"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssm:TerminateSession"
            ],
            "Resource": [
                "arn:aws:ssm:*:*:session/${aws:username}-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret",
                "secretsmanager:ListSecretVersionIds",
                "secretsmanager:ListSecrets"
            ],
            "Resource": [
                "arn:aws:secretsmanager:*:{account_id}:secret:*"
            ],
            "Condition": {
                "StringEquals": {
                    "secretsmanager:ResourceTag/{tag_key}": "{tag_value}"
                }
            }
        }
    ]
}

```
Note that you need to provide value for the {account_id} and if you would like to limit the access to specific secret resource using tags add the value for {tag_key}": "{tag_value}, else you can remove the condition which will give the user permission for all secrets in the mentioned account, which is not recommened. 

2. Please make sure that you set AWS profile on your machine with credintial of the user created in step one.

```
  $ aws configure --profile bastion-test

```

3. Read required paramters: You will need the ec2 instance id to connect to session manager.

```
INSTANCE_ID=$(aws ec2 describe-instances \
               --filter "Name=tag:Name,Values= BastionHost" \
               --query "Reservations[].Instances[?State.Name == 'running'].InstanceId[]" \
               --output text --profile bastion-test)
```

If you plan to connect to RDS instance for example you will need to get the credintials assuming it is stored in AWS Secrets Manager. you can read the values as follow.

```
my_db_host=$(aws secretsmanager get-secret-value --region {secret_region} --secret-id {secret_id} --profile bastion-test | jq --raw-output .SecretString | jq -r ."host")
 
my_db_username=$(aws secretsmanager get-secret-value --region {secret_region} --secret-id {secret_id} --profile bastion-test | jq --raw-output .SecretString | jq -r ."username")
 
my_db_password=$(aws secretsmanager get-secret-value --region {secret_region} --secret-id {secret_id} --profile bastion-test | jq --raw-output .SecretString | jq -r ."password")
```
4. Connect using SSM session manager: 
You can use SSM session manager to connect to your Bastion Host using the following command
```
aws ssm start-session --target $INSTANCE_ID --profile bastion-test
```
You can also use port forward session using the following command
```
aws ssm start-session --target $INSTANCE_ID \
                       --document-name AWS-StartPortForwardingSession \
                       --parameters '{"portNumber":["{remote_port_number}"],"localPortNumber":["{your_local_port_number}"]}' --profile bastion-test
```

You need to replace {remote_port_number}, {your_local_port_number} with the target port numbers from remote server to local port.

5. Connect using SSH

Update the SSH configuration file to allow running a proxy command that starts a Session Manager session and transfer all data through the connection.

```
vim ~/.ssh/config
 
#Add SSH over Session Manager
host i-* mi-*
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

Get instance key pair

```
aws secretsmanager get-secret-value \
  --secret-id ec2-ssh-key/BastionHostKey/private \
  --query SecretString \
  --output text --profile bastion-test > bastion-key-pair.pem
 
chmod 400 bastion-key-pair.pem
```

Open ssh tunnel

```
ssh -f -N ec2-user@$INSTANCE_ID -L {local_port}:{host}:{remote_port} -i bastion-key-pair.pem

```
You need to replace {local_port} for your local port, {host} for example RDS endpoint, And {remote_port} for the taregt remote port such as 3306 mysql port. 

You’ll be asked: The authenticity of host '$INSTANCE_ID (<no hostip for proxy command>)' can't be established. ECDSA key fingerprint is SHA256:....
Are you sure you want to continue connecting (yes/no/[fingerprint])?

Hit “yes” and the $INSTANCE_ID will be added to the list of known hosts.


# Clean up

To avoid unexpected charges to your account, make sure you clean up your CDK stack.

You can either delete the stack through the AWS CloudFormation console or use cdk destroy:

```
cdk destroy -c environment="<environment_name>" -c account="<ACCOUNT ID>" AwsBastion-Ec2CdkStack --profile bastion-cdk

```
You’ll be asked: Are you sure you want to delete: AwsBastion-NetworkCdkStack, AwsBastion-Ec2CdkStack (y/n)?

Hit “y” and you’ll see your stack being destroyed.

And If you choose to deploy the "AwsBastion-NetworkCdkStack" stack you can clean it up using following Command

```
cdk destroy -c environment="<environment_name>" -c account="<ACCOUNT ID>" AwsBastion-NetworkCdkStack --profile bastion-cdk

```

# Conclusion
In this blog post, we showed you how to use CDK to provision secure Bastion Hosts, which allows you to provide access to private resources in your VPC private subnets. The infrastructure uses SSM Session Manager and IAM policy to define who can access the private resources. It also shows you how you are able to extend the solution to fit your requirements. Furthermore, you can integrate the solution with your CI/CD pipeline to deploy it across multiple environments.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.