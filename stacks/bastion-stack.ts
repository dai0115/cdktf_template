import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";

import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { EcrRepository } from "@cdktf/provider-aws/lib/ecr-repository";
import { EcsTaskDefinition } from "@cdktf/provider-aws/lib/ecs-task-definition";
import { EcsCluster } from "@cdktf/provider-aws/lib/ecs-cluster";
import { EcsService } from "@cdktf/provider-aws/lib/ecs-service";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { DataAwsCallerIdentity } from "@cdktf/provider-aws/lib/data-aws-caller-identity";

import { ConfigType } from "../config/types";

type BastionProps = {
  config: ConfigType;
  bastionSubnetId: string;
  bastionSG: SecurityGroup;
};

export class BastionStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: BastionProps) {
    super(scope, id);
    const { bastionSG, bastionSubnetId } = props;
    const { region, prefix } = props.config;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    const accountId = new DataAwsCallerIdentity(this, "account-id").accountId;

    // 踏み台のイメージを保存するためのリポジトリを作成
    const repo = new EcrRepository(this, "ecr", {
      name: `${prefix}-ecr-bastion-repo`,
      imageScanningConfiguration: { scanOnPush: true },
      encryptionConfiguration: [
        {
          encryptionType: "KMS",
        },
      ],
    });

    const taskAssumeRole = this.createAssumeRolePolicy(
      `${prefix}-task`,
      "ecs-tasks.amazonaws.com"
    );

    // タスクロールの作成
    const taskRole = new IamRole(this, `${prefix}-task-role`, {
      name: `${prefix}-task-role`,
      assumeRolePolicy: taskAssumeRole.json,
      inlinePolicy: [
        {
          name: "taskRole",
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  "ssmmessages:CreateActivation",
                  "ssmmessages:RemoveTagsFromResource",
                  "ssmmessages:AddTagsFromResource",
                  "ssmmessages:DeleteActivation",
                ],
                Resource: "*",
              },
            ],
          }),
        },
      ],
    });
    // タスク実行ロールの作成
    const taskExecutionRole = new IamRole(
      this,
      `${prefix}-task-execution-role`,
      {
        name: `${prefix}-task-execution-role`,
        assumeRolePolicy: taskAssumeRole.json,
        inlinePolicy: [
          {
            name: "taskExecutionRole",
            policy: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Action: [
                    "ecr:GetAuthorizationToken",
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:BatchGetImage",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                    "secretsmanager:GetSecret",
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:ListSecrets",
                    "logs:*",
                  ],
                  Resource: "*",
                },
              ],
            }),
          },
        ],
      }
    );

    // ECSタスクがssmにわたすIAMロールの作成
    const ssmAssumeRole = this.createAssumeRolePolicy(
      `${prefix}-ssm`,
      "ssm.amazonaws.com"
    );
    // ssmが利用するロールの作成
    new IamRole(this, `${prefix}-ssm-role`, {
      name: `${prefix}-ssm-role`,
      assumeRolePolicy: ssmAssumeRole.json,
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
      ],
    });

    // ECS関連のリソースを作成
    const cluster = new EcsCluster(this, `${prefix}-BastionCluster`, {
      name: `${prefix}-BastionCluster`,
      setting: [
        {
          name: "containerInsights",
          value: "enabled",
        },
      ],
    });

    const taskDefinition = new EcsTaskDefinition(
      this,
      `${prefix}-BastiontaskDefinition`,
      {
        family: `${prefix}-BastiontaskDefinition`,
        taskRoleArn: taskRole.arn,
        executionRoleArn: taskExecutionRole.arn,
        requiresCompatibilities: ["FARGATE"],
        cpu: "256",
        memory: "512",
        networkMode: "awsvpc",
        containerDefinitions: JSON.stringify([
          {
            name: "bastion",
            image: `${accountId}.dkr.ecr.ap-northeast-1.amazonaws.com/${repo.name}:latest`,
            essential: true,
            cpu: 256,
            memory: 512,
            portMappings: [
              {
                containerPort: 80,
              },
            ],
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-region": "ap-northeast-1",
                "awslogs-stream-prefix": "ecs-bastion-task",
                "awslogs-group": "/ecs/ecs-bastion-task",
                "awslogs-create-group": "true",
              },
            },
          },
        ]),
      }
    );

    new EcsService(this, `${prefix}-BastionEcsService`, {
      name: `${prefix}-BastionEcsService`,
      cluster: cluster.name,
      enableExecuteCommand: true,
      taskDefinition: taskDefinition.arn,
      desiredCount: 1,
      launchType: "FARGATE",
      networkConfiguration: {
        securityGroups: [bastionSG.id],
        subnets: [bastionSubnetId],
      },
    });
  }

  /**
   * @param prefix - リソース命名用のprefix
   * @param identifiers - アクセスするAWSサービスのidentifiersを指定
   * @returns 作成したロールをJSON形式で返却
   */
  private createAssumeRolePolicy(
    prefix: string,
    identifiers: string
  ): DataAwsIamPolicyDocument {
    const assumeRolePolicy = new DataAwsIamPolicyDocument(
      this,
      `${prefix}-assumeRolePolicy`,
      {
        statement: [
          {
            effect: "Allow",
            actions: ["sts:AssumeRole"],
            principals: [
              {
                identifiers: [identifiers],
                type: "Service",
              },
            ],
          },
        ],
      }
    );
    return assumeRolePolicy;
  }
}
