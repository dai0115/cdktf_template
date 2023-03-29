import { CloudfrontDistribution } from "@cdktf/provider-aws/lib/cloudfront-distribution";
import { CloudfrontOriginAccessControl } from "@cdktf/provider-aws/lib/cloudfront-origin-access-control";
import { DataAwsCallerIdentity } from "@cdktf/provider-aws/lib/data-aws-caller-identity";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketAcl } from "@cdktf/provider-aws/lib/s3-bucket-acl";
import { S3BucketPolicy } from "@cdktf/provider-aws/lib/s3-bucket-policy";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { Wafv2IpSet } from "@cdktf/provider-aws/lib/wafv2-ip-set";
import { Wafv2WebAcl } from "@cdktf/provider-aws/lib/wafv2-web-acl";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { ConfigType } from "../config/types";

type StaticWebsiteHostingProps = {
  config: ConfigType;
};

export class StaticWebsiteHostingStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: StaticWebsiteHostingProps) {
    super(scope, id);
    const { prefix } = props.config;
    const {
      s3,
      bucketAcl,
      ipSet,
      wafv2WebAcl,
      cloudfrontOAC,
      cloudfrontDistribution,
      s3PublicAccessBlock,
    } = props.config.staticWebsiteHosting;

    const provider = new AwsProvider(this, `${prefix}-AWS-region-virginia`, {
      region: "us-east-1", //右記URLの制約により、リージョンをus-eas-1に変更。https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/how-aws-waf-works.html#how-aws-waf-works-resources
      alias: "virginia",
    });

    const accountId = new DataAwsCallerIdentity(this, "account-id").accountId;

    const authBucket = new S3Bucket(this, `${prefix}-s3-bucket`, {
      ...s3,
    });
    new S3BucketAcl(this, `${prefix}-s3-acl`, {
      bucket: authBucket.bucket,
      ...bucketAcl,
    });

    const caasipSet = new Wafv2IpSet(this, `${prefix}-waf-ipset`, {
      provider: provider,
      ...ipSet,
    });

    const waf = new Wafv2WebAcl(this, `${prefix}-waf-acl`, {
      ...wafv2WebAcl,
      name: `${prefix}-waf-acl`,
      provider: provider,
      rule: [
        {
          name: "AllowIpsRule",
          priority: 0,
          action: { allow: {} },
          statement: {
            ipSetReferenceStatement: { arn: caasipSet.arn },
          },
          visibilityConfig: {
            cloudwatchMetricsEnabled: true,
            metricName: "AllowedIPMetric",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 1,
          overrideAction: {
            none: {},
          },
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesCommonRuleSet",
              vendorName: "AWS",
            },
          },
          visibilityConfig: {
            cloudwatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
          priority: 2,
          overrideAction: {
            none: {},
          },
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesKnownBadInputsRuleSet",
              vendorName: "AWS",
            },
          },
          visibilityConfig: {
            cloudwatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
            sampledRequestsEnabled: true,
          },
        },
        {
          name: "AWS-AWSManagedRulesAdminProtectionRuleSet",
          priority: 3,
          overrideAction: {
            none: {},
          },
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesAdminProtectionRuleSet",
              vendorName: "AWS",
            },
          },
          visibilityConfig: {
            cloudwatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesAdminProtectionRuleSet",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    const oac = new CloudfrontOriginAccessControl(
      this,
      `${prefix}-cloudfront-OAC`,
      {
        ...cloudfrontOAC,
        name: authBucket.id,
      }
    );

    const distribution = new CloudfrontDistribution(
      this,
      `${prefix}-cloudfront-distribution`,
      {
        webAclId: waf.arn,
        origin: [
          {
            domainName: authBucket.bucketRegionalDomainName,
            originAccessControlId: oac.id,
            originId: authBucket.bucket,
          },
        ],
        defaultCacheBehavior: {
          forwardedValues: {
            queryString: false,
            cookies: {
              forward: "none",
            },
            headers: [
              "Accept-Datetime",
              "Accept-Encoding",
              "Accept-Language",
              "Origin",
            ],
          },
          allowedMethods: ["GET", "HEAD"],
          cachedMethods: ["GET", "HEAD"],
          viewerProtocolPolicy: "allow-all",
          targetOriginId: authBucket.bucket,
        },
        ...cloudfrontDistribution,
      }
    );

    new S3BucketPublicAccessBlock(this, `${prefix}-s3-PAB`, {
      bucket: authBucket.id,
      ...s3PublicAccessBlock,
    });

    new S3BucketPolicy(this, `${prefix}-s3-policy`, {
      bucket: authBucket.bucket,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowCloudFrontServicePrincipalReadOnly",
            Effect: "Allow",
            Principal: {
              Service: "cloudfront.amazonaws.com",
            },
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${authBucket.bucket}/*`,
            Condition: {
              StringEquals: {
                "AWS:SourceArn": `arn:aws:cloudfront::${accountId}:distribution/${distribution.id}`,
              },
            },
          },
        ],
      }),
    });
  }
}
