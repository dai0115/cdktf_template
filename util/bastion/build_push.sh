#!/bin/bash

# retrive account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
ECR_REPO_NAME="application-dev-ecr-bastion-repo"

# login to ECR
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS \
--password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com

# Building and Tagging a Docker image
docker buildx build --platform linux/amd64 -t fargate-bastion:latest .
docker image tag fargate-bastion:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com/${ECR_REPO_NAME}:latest

# push Docker image to ECR
docker image push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com/${ECR_REPO_NAME}:latest