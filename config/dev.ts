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
};
