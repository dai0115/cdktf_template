import { appName, ConfigType } from "./types";

export const devConfig: ConfigType = {
  region: "ap-northeast-1",
  stage: "dev",
  prefix: "bigbang-dev",
  appName: appName,
  vpc: {
    vpcCidr: "10.0.0.0/16",
    availabilityZones: ["ap-northeast-1a", "ap-northeast-1c"],
    privateSubnets: ["10.0.0.0/24", "10.0.1.0/24"],
    privateSubnetNames: ["PrivateAlb1", "PrivateAlb2"],
    intraSubnets: ["10.0.2.0/24", "10.0.3.0/24"],
    intraSubnetNames: ["PrivateEcs1", "PrivateEcs2"],
    databaseSubnets: ["10.0.4.0/24", "10.0.5.0/24"],
    databaseSubnetNames: ["PrivateDb1", "PrivateDb2"],
  },
  db: {
    dbMasterUsername: "bigbangroot",
    dbFamily: "aurora-mysql8.0",
    clusterEngine: "aurora-mysql",
    clusterEngineVersion: "8.0.mysql_aurora.3.02.2",
    availabilityZones: ["ap-northeast-1a"],
    instanceCount: 1,
    instanceClass: "db.t3.medium",
  },
};
