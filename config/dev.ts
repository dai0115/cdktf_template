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
};
