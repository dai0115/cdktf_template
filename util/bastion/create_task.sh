#!/bin/bash

# set environment
ENV=dev
CLUSTER=application-$ENV-BastionCluster
SUBNETS=$(aws ec2 describe-subnets --filter "Name=tag:Name,Values=application-dev-Bastion" | jq -r '.Subnets[].SubnetId')
# SECURITY_GROUPS=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=bastionSG" | jq -r '.SecurityGroups[].GroupId')
SECURITY_GROUPS=sg-0d30c9d73c692c610

# start task
aws ecs run-task --cluster $CLUSTER --count 1 --launch-type FARGATE \
    --enable-execute-command \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUPS],assignPublicIp=DISABLED}" \
    --task-definition application-dev-BastiontaskDefinition