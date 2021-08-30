#! /bin/bash
sudo su
yum -y update
yum -y install jq
# Example of adding MYSQL client for the Bastion to allow users to connect to RDS(MYSQL) instance.
sudo yum install mysql