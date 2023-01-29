import { appName, ConfigType } from "./types";

export const devConfig: ConfigType = {
  region: "ap-northeast-1",
  stage: "dev",
  prefix: "project-dev", // TODO: change propject name
  appName: appName,
  vpcConfig: {
    vpcCidr: "10.0.0.0/16",
    availabilityZones: ["ap-northeast-1a", "ap-northeast-1c"],
    privateSubnets: ["10.0.0.0/24", "10.0.1.0/24"],
    privateSubnetNames: ["PrivateAlb1", "PrivateAlb2"],
    intraSubnets: ["10.0.2.0/24", "10.0.3.0/24"],
    intraSubnetNames: ["PrivateEcs1", "PrivateEcs2"],
    databaseSubnets: ["10.0.4.0/24", "10.0.5.0/24"],
    databaseSubnetNames: ["PrivateDb1", "PrivateDb2"],
  },
};
