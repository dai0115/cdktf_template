import { TerraformStack } from "cdktf";
import { Construct } from "constructs";

import { AlbListener } from "@cdktf/provider-aws/lib/alb-listener";
import { DataAwsCallerIdentity } from "@cdktf/provider-aws/lib/data-aws-caller-identity";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { EcrRepository } from "@cdktf/provider-aws/lib/ecr-repository";
import { EcsCluster } from "@cdktf/provider-aws/lib/ecs-cluster";
import { EcsService } from "@cdktf/provider-aws/lib/ecs-service";
import { EcsTaskDefinition } from "@cdktf/provider-aws/lib/ecs-task-definition";
import { CodedeployApp } from "@cdktf/provider-aws/lib/codedeploy-app";
import { CodedeployDeploymentGroup } from "@cdktf/provider-aws/lib/codedeploy-deployment-group";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { LbTargetGroup } from "@cdktf/provider-aws/lib/lb-target-group";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";

import { ConfigType } from "../config/types";

type ComputingProps = {
  config: ConfigType;
  ecsSG: SecurityGroup;
  ecsSubnetIds: string[];
  albSG: SecurityGroup;
  albSubnetIds: string[];
  targetG: LbTargetGroup;
  targetG2: LbTargetGroup;
  albListener: AlbListener;
  cognitoId: String;
  rdsEndpoint: string;
  rdsSecrets: SecretsmanagerSecret;
};

export class ComputingStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: ComputingProps) {
    super(scope, id);
    const { region, prefix } = props.config;
    const {
      ecrConfig,
      clusterConfig,
      taskRoleConfig,
      executionRoleConfig,
      taskDefinitionConfig,
      serviceConfig,
      autoRollbackConfig,
      bluegreenDeploymentConfig,
      deploymentStyleConfig,
      deploymentConfigName,
    } = props.config.computing;
    const {
      ecsSG,
      ecsSubnetIds,
      albListener,
      targetG,
      targetG2,
      rdsEndpoint,
      rdsSecrets,
    } = props;

    new AwsProvider(this, `${prefix}-AWS`, {
      region: region,
    });

    const accountId = new DataAwsCallerIdentity(this, "account-id").accountId;

    const repo = new EcrRepository(this, "ecr", {
      name: `${prefix}-ecr-repo`,
      ...ecrConfig,
    });

    const cluster = new EcsCluster(this, "ecs", {
      name: `${prefix}-ecs-cluster`,
      ...clusterConfig,
    });

    const assumeRolePolicyJson = this.createAssumeRolePolicyJson(
      `${prefix}-Task`,
      "ecs-tasks.amazonaws.com"
    );

    // タスクロールの作成
    const taskRole = new IamRole(this, `${prefix}-iam-role-forEcsService`, {
      name: `${prefix}-iam-role-forEcsService`,
      assumeRolePolicy: assumeRolePolicyJson,
      permissionsBoundary: `arn:aws:iam::${accountId}:policy/DeloittePermissionsBoundaryPolicy`, // デロイトグローバルが付与する境界
      ...taskRoleConfig,
    });

    // タスク実行ロールの作成
    const executionRole = new IamRole(
      this,
      `${prefix}-iam-role-forEcsExecution`,
      {
        name: `${prefix}-iam-role-forEcsExecution`,
        assumeRolePolicy: assumeRolePolicyJson,
        permissionsBoundary: `arn:aws:iam::${accountId}:policy/DeloittePermissionsBoundaryPolicy`, // デロイトグローバルが付与する境界
        ...executionRoleConfig,
      }
    );

    const taskDefinition = new EcsTaskDefinition(
      this,
      `${prefix}-ecs-taskDefinition`,
      {
        family: `${prefix}-ecs-taskDefinition`,
        taskRoleArn: taskRole.arn,
        executionRoleArn: executionRole.arn,
        containerDefinitions: JSON.stringify([
          {
            name: "app",
            image: `${accountId}.dkr.ecr.ap-northeast-1.amazonaws.com/${repo.name}:latest`,
            // TODO change here on your project
            environment: [
              { name: "DB_HOST", value: rdsEndpoint },
              { name: "DB_PORT", value: "3306" },
              { name: "SERVER_PORT_NO", value: "80" },
            ],
            secrets: [
              { name: "DB_USER", valueFrom: `${rdsSecrets.arn}:username::` },
              {
                name: "DB_PASSWORD",
                valueFrom: `${rdsSecrets.arn}:password::`,
              },
            ],
            cpu: 512,
            memory: 2048,
            portMappings: [
              {
                containerPort: 80,
                hostPort: 80,
              },
            ],
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-region": "ap-northeast-1",
                "awslogs-stream-prefix": "taurus-backend",
                "awslogs-group": "/ecs/taurus-backend/dev/app",
                "awslogs-create-group": "true",
              },
            },
            healthCheck: {
              command: [
                "CMD-SHELL",
                "curl -f http://localhost/health || exit 1",
              ],
              interval: 60,
              timeout: 5,
              rtires: 3,
              startPeriod: 60,
              containerHealth: "healthy",
              failureThreshold: 2,
            },
          },
        ]),
        ...taskDefinitionConfig,
      }
    );

    const ecsService = new EcsService(this, `${prefix}-ecs-service`, {
      name: `${prefix}-ecs-service`,
      cluster: cluster.arn,
      taskDefinition: taskDefinition.arn,
      deploymentController: {
        type: "CODE_DEPLOY",
      },
      networkConfiguration: {
        subnets: ecsSubnetIds,
        assignPublicIp: false,
        securityGroups: [ecsSG.id],
      },
      loadBalancer: [
        {
          containerName: "app",
          containerPort: 80,
          targetGroupArn: targetG.arn,
        },
      ],
      ...serviceConfig,
    });

    // CodeDeploy関連リソースの作成
    const deployAssumeRolePolicyJson = this.createAssumeRolePolicyJson(
      `${prefix}-Deploy`,
      "codedeploy.amazonaws.com"
    );

    const codeDeployRole = new IamRole(
      this,
      `${prefix}-iam-role-forCodeDeployService`,
      {
        name: `${prefix}-iam-role-forCodeDeployService`,
        assumeRolePolicy: deployAssumeRolePolicyJson,
        managedPolicyArns: ["arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"],
      }
    );

    const codeDeployApp = new CodedeployApp(this, `${prefix}-codeDeploy-App`, {
      computePlatform: "ECS",
      name: `${prefix}-codeDeploy-App`,
    });

    new CodedeployDeploymentGroup(this, `${prefix}-codeDeploy-Group`, {
      appName: codeDeployApp.name,
      deploymentGroupName: `${prefix}-codeDeploy-Group`,
      serviceRoleArn: codeDeployRole.arn,
      deploymentConfigName: deploymentConfigName,
      ecsService: {
        serviceName: ecsService.name,
        clusterName: cluster.name,
      },
      loadBalancerInfo: {
        targetGroupPairInfo: {
          targetGroup: [
            {
              name: targetG.name,
            },
            {
              name: targetG2.name,
            },
          ],
          prodTrafficRoute: {
            listenerArns: [albListener.arn],
          },
        },
      },
      autoRollbackConfiguration: autoRollbackConfig,
      blueGreenDeploymentConfig: bluegreenDeploymentConfig,
      deploymentStyle: deploymentStyleConfig,
    });
  }

  /**
   * @param prefix - リソース命名用のprefix
   * @param identifiers - アクセスするAWSサービスのidentifiersを指定
   * @returns 作成したロールをJSON形式で返却
   */
  private createAssumeRolePolicyJson(
    prefix: string,
    identifiers: string
  ): string {
    const assumeRolePolicyJson = new DataAwsIamPolicyDocument(
      this,
      `${prefix}-iam-assumeRolePolicyJson`,
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
    return assumeRolePolicyJson.json;
  }
}
