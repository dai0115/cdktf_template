import { VpcConfig } from "@cdktf/provider-aws/lib/vpc";

import { S3BucketConfig } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketAclConfig } from "@cdktf/provider-aws/lib/s3-bucket-acl";
import { S3BucketPublicAccessBlockConfig } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { Wafv2IpSetConfig } from "@cdktf/provider-aws/lib/wafv2-ip-set";
import { Wafv2RuleGroupConfig } from "@cdktf/provider-aws/lib/wafv2-rule-group";
import { Wafv2WebAclConfig } from "@cdktf/provider-aws/lib/wafv2-web-acl";
import { CloudfrontDistributionConfig } from "@cdktf/provider-aws/lib/cloudfront-distribution";
import { CloudfrontOriginAccessControlConfig } from "@cdktf/provider-aws/lib/cloudfront-origin-access-control";

export type stageType = "dev" | "staging" | "prduction";

type prefix = `application-${stageType}`;

// Stack毎に可変なプロパティを定義
export type ConfigType = {
  region: string;
  prefix: prefix;
  stage: stageType;
  network: NetworkConfig;
  db: DbConfig;
  staticWebsiteHosting: StaticWebsiteHostingConfigType;
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
