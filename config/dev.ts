import { ConfigType } from "./types";

export const devConfig: ConfigType = {
  region: "ap-northeast-1",
  stage: "dev",
  prefix: "application-dev",
  network: {
    vpcConfig: {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  },
  db: {
    dbMasterUsername: "bigbangroot",
    dbFamily: "aurora-mysql8.0",
    clusterEngine: "aurora-mysql",
    clusterEngineVersion: "8.0.mysql_aurora.3.02.2",
    instanceCount: 1,
    instanceClass: "db.t3.medium",
  },
  cognito: {
    name: "bigbang-dev-Cognito",
    // Cognito ユーザープールのサインインオプション
    usernameAttributes: [],

    // 自動検証される属性
    autoVerifiedAttributes: [],
    // UserPoolのすべてのユーザーにユーザー名の大文字と小文字の区別を適用するかどうか
    usernameConfiguration: { caseSensitive: true },
    // ユーザ側でのアカウント登録可否の設定
    adminCreateUserConfig: {
      allowAdminCreateUserOnly: true,
    },
    passwordPolicy: {
      minimumLength: 10,
      requireNumbers: true,
      requireLowercase: true,
      requireUppercase: true,
      requireSymbols: false,
      temporaryPasswordValidityDays: 1,
    },
    // 既存属性の設定変更、新規属性の追加
    schema: [
      {
        attributeDataType: "String",
        name: "email",
        mutable: true,
        required: true,
        stringAttributeConstraints: {
          minLength: "0",
          maxLength: "2048",
        },
      },
      {
        attributeDataType: "String",
        name: "folder",
        mutable: true,
        stringAttributeConstraints: {
          minLength: "64",
          maxLength: "64",
        },
      },
      {
        attributeDataType: "String",
        name: "password_status",
        mutable: true,
        stringAttributeConstraints: {},
      },
      {
        attributeDataType: "String",
        name: "mfa_status",
        mutable: true,
        stringAttributeConstraints: {},
      },
      {
        attributeDataType: "String",
        name: "mfa_secret",
        mutable: true,
        stringAttributeConstraints: {},
      },
      {
        attributeDataType: "String",
        name: "mfa_temp_secret",
        mutable: true,
        stringAttributeConstraints: {},
      },
      {
        attributeDataType: "String",
        name: "mfa_type",
        mutable: true,
        stringAttributeConstraints: {},
      },
      {
        attributeDataType: "String",
        name: "identity_id",
        mutable: true,
        stringAttributeConstraints: {},
      },
    ],
    // MFAの有効化
    mfaConfiguration: "ON",
    // MFAでOTPを有効化
    softwareTokenMfaConfiguration: { enabled: true },
    // アカウントの回復
    accountRecoverySetting: {
      recoveryMechanism: [
        {
          name: "verified_email",
          priority: 1,
        },
      ],
    },
    deletionProtection: "INACTIVE",
  },
  staticWebsiteHosting: {
    s3: {
      bucket: "application-dev-cdktf-template", // chenge here to be unique
    },
    bucketAcl: { acl: "private" },
    ipSet: {
      name: "ipSet",
      scope: "CLOUDFRONT",
      ipAddressVersion: "IPV4",
    },
    ruleGroup: {
      scope: "CLOUDFRONT",
      capacity: 2,
      visibilityConfig: {
        cloudwatchMetricsEnabled: false,
        metricName: "rule-group",
        sampledRequestsEnabled: false,
      },
    },
    wafv2WebAcl: {
      description: `Web ACL`,
      scope: "CLOUDFRONT",
      defaultAction: { block: {} },
      visibilityConfig: {
        cloudwatchMetricsEnabled: false,
        metricName: "WebACLMetric",
        sampledRequestsEnabled: false,
      },
    },
    cloudfrontOAC: {
      originAccessControlOriginType: "s3",
      signingBehavior: "always",
      signingProtocol: "sigv4",
    },
    cloudfrontDistribution: {
      enabled: true,
      defaultRootObject: "index.html",
      restrictions: {
        geoRestriction: {
          restrictionType: "whitelist",
          locations: ["JP"],
        },
      },
      viewerCertificate: { cloudfrontDefaultCertificate: true },
      priceClass: "PriceClass_200",
    },
    s3PublicAccessBlock: {
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    },
  },
  computing: {
    ecrConfig: {
      imageScanningConfiguration: { scanOnPush: true },
      encryptionConfiguration: [
        {
          encryptionType: "KMS",
        },
      ],
    },
    clusterConfig: {
      setting: [
        {
          value: "enabled",
          name: "containerInsights",
        },
      ],
    },
    taskRoleConfig: {
      inlinePolicy: [
        {
          name: "taskRole",
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  // TODO change here based on your application
                  "s3:ListBucket",
                  "s3:GetObject",
                  "s3:PutObject",
                ],
                Resource: "*",
              },
            ],
          }),
        },
      ],
    },
    executionRoleConfig: {
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
                  "logs:*", // TODO 全権限は望ましく無いのでCreateLogGroupでエラーとなる原因を調査
                ],
                Resource: "*",
              },
            ],
          }),
        },
      ],
    },
    taskDefinitionConfig: {
      requiresCompatibilities: ["FARGATE"],
      cpu: "512",
      memory: "2048",
      networkMode: "awsvpc",
    },
    serviceConfig: {
      launchType: "FARGATE",
      desiredCount: 1,
    },
    // https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
    autoRollbackConfig: {
      enabled: true,
      events: ["DEPLOYMENT_FAILURE"],
    },
    bluegreenDeploymentConfig: {
      deploymentReadyOption: {
        actionOnTimeout: "CONTINUE_DEPLOYMENT",
        waitTimeInMinutes: 0,
      },
      terminateBlueInstancesOnDeploymentSuccess: {
        action: "TERMINATE",
        terminationWaitTimeInMinutes: 1, //開発環境はロールバックの必要がほとんどないためデプロイの速さを優先
      },
    },
    deploymentStyleConfig: {
      deploymentOption: "WITH_TRAFFIC_CONTROL",
      deploymentType: "BLUE_GREEN",
    },
    deploymentConfigName: "CodeDeployDefault.ECSAllAtOnce",
  },
};
