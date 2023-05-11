import { VpcConfig } from "@cdktf/provider-aws/lib/vpc";

import { S3BucketConfig } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketAclConfig } from "@cdktf/provider-aws/lib/s3-bucket-acl";
import { S3BucketPublicAccessBlockConfig } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { Wafv2IpSetConfig } from "@cdktf/provider-aws/lib/wafv2-ip-set";
import { Wafv2RuleGroupConfig } from "@cdktf/provider-aws/lib/wafv2-rule-group";
import { Wafv2WebAclConfig } from "@cdktf/provider-aws/lib/wafv2-web-acl";
import { CloudfrontDistributionConfig } from "@cdktf/provider-aws/lib/cloudfront-distribution";
import { CloudfrontOriginAccessControlConfig } from "@cdktf/provider-aws/lib/cloudfront-origin-access-control";
import { CognitoUserPoolConfig } from "@cdktf/provider-aws/lib/cognito-user-pool";
import { EcrRepositoryConfig } from "@cdktf/provider-aws/lib/ecr-repository";
import { EcsClusterConfig } from "@cdktf/provider-aws/lib/ecs-cluster";
import { EcsServiceConfig } from "@cdktf/provider-aws/lib/ecs-service";
import { EcsTaskDefinitionConfig } from "@cdktf/provider-aws/lib/ecs-task-definition";
import {
  CodedeployDeploymentGroupAutoRollbackConfiguration,
  CodedeployDeploymentGroupBlueGreenDeploymentConfig,
  CodedeployDeploymentGroupDeploymentStyle,
} from "@cdktf/provider-aws/lib/codedeploy-deployment-group";
import { IamRoleConfig } from "@cdktf/provider-aws/lib/iam-role";

export type stageType = "dev" | "staging" | "prduction";

type prefix = `application-${stageType}`;

// Stack毎に可変なプロパティを定義
export type ConfigType = {
  region: string;
  prefix: prefix;
  stage: stageType;
  network: NetworkConfig;
  db: DbConfig;
  cognito: CognitoConfigType;
  staticWebsiteHosting: StaticWebsiteHostingConfigType;
  computing: ComputingConfigType;
};

type NetworkConfig = {
  vpcConfig: VpcConfig;
};

type DbConfig = {
  dbMasterUsername: string;
  dbFamily: string;
  clusterEngine: string;
  clusterEngineVersion: string;
  instanceCount: number;
  instanceClass: string;
};

type OptionalCognitoConfig =
  | "aliasAttributes"
  | "deviceConfiguration"
  | "emailVerificationMessage"
  | "emailVerificationSubject"
  | "smsAuthenticationMessage"
  | "smsConfiguration"
  | "smsVerificationMessage"
  | "tags"
  | "userAttributeUpdateSettings"
  | "userPoolAddOns"
  | "verificationMessageTemplate";

type CognitoConfigType = Omit<CognitoUserPoolConfig, OptionalCognitoConfig>;

type StaticWebsiteHostingConfigType = {
  s3: S3ConfigType;
  bucketAcl: S3AclType;
  ipSet: IPSetType;
  ruleGroup: RuleGroupConfigType;
  wafv2WebAcl: Wafv2WebAclType;
  cloudfrontOAC: CloudfrontOriginAccessControlConfigType;
  cloudfrontDistribution: CloudfrontDistributionWithoutType;
  s3PublicAccessBlock: S3PublicAccessBlockType;
};

// SPA（App）用S3バケットS3の型定義
type OptionalS3BucketConfig = "none";
type OptionalS3BucketAclConfig = "bucket";
type S3ConfigType = Omit<S3BucketConfig, OptionalS3BucketConfig>;
type S3AclType = Omit<S3BucketAclConfig, OptionalS3BucketAclConfig>;

// IPSetの型定義
type OptionalIpSetConfig = "provider";
type IPSetType = Omit<Wafv2IpSetConfig, OptionalIpSetConfig>;

// WafRuleGroupの型定義
type OptionalRuleGroupConfig = "name";
type RuleGroupConfigType = Omit<Wafv2RuleGroupConfig, OptionalRuleGroupConfig>;

// WafAclの型定義
type OptinalWafv2WebAclConfig = "name" | "provider";
type Wafv2WebAclType = Omit<Wafv2WebAclConfig, OptinalWafv2WebAclConfig>;

// cloudfrontOACの型定義
type OptinalCloudfrontOriginAccessControlConfig = "name";
type CloudfrontOriginAccessControlConfigType = Omit<
  CloudfrontOriginAccessControlConfig,
  OptinalCloudfrontOriginAccessControlConfig
>;

// Cloudfront Distributionの型定義
type OptionalCloudfrontDistributionType = "origin" | "defaultCacheBehavior";
type CloudfrontDistributionWithoutType = Omit<
  CloudfrontDistributionConfig,
  OptionalCloudfrontDistributionType
>;

type OptinalS3BucketPublicAccessBlockConfig = "bucket";
type S3PublicAccessBlockType = Omit<
  S3BucketPublicAccessBlockConfig,
  OptinalS3BucketPublicAccessBlockConfig
>;

type ComputingConfigType = {
  ecrConfig: Omit<EcrRepositoryConfig, "name">;
  clusterConfig: Omit<EcsClusterConfig, "name">;
  taskRoleConfig: Omit<IamRoleConfig, "name" | "assumeRolePolicy">;
  executionRoleConfig: Omit<IamRoleConfig, "name" | "assumeRolePolicy">;
  taskDefinitionConfig: Omit<
    EcsTaskDefinitionConfig,
    | "name"
    | "family"
    | "taskRoleArn"
    | "executionRoleArn"
    | "containerDefinitions"
  >;
  serviceConfig: Omit<
    EcsServiceConfig,
    | "name"
    | "cluster"
    | "taskDefinition"
    | "networkConfiguration"
    | "loadBalancer"
  >;
  autoRollbackConfig: CodedeployDeploymentGroupAutoRollbackConfiguration;
  bluegreenDeploymentConfig: CodedeployDeploymentGroupBlueGreenDeploymentConfig;
  deploymentStyleConfig: CodedeployDeploymentGroupDeploymentStyle;
  deploymentConfigName: string;
};
