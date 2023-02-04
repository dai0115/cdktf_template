export type stageType = "dev" | "staging" | "prduction";

export const appName = "bigbang";

type prefix = `bigbang-${stageType}`;

export type ConfigType = {
  region: string;
  prefix: prefix;
  stage: stageType;
  appName: typeof appName;
  vpc: VpcConfig;
  db: dbConfig;
};

type VpcConfig = {
  vpcCidr: string;
  availabilityZones: string[];
  privateSubnets: string[];
  privateSubnetNames: string[];
  intraSubnets: string[];
  intraSubnetNames: string[];
  databaseSubnets: string[];
  databaseSubnetNames: string[];
};

type dbConfig = {
  dbMasterUsername: string;
  dbFamily: string;
  clusterEngine: string;
  clusterEngineVersion: string;
  availabilityZones: string[];
  instanceCount: number;
  instanceClass: string;
};

export type SecurityGroupRules = {
  fromPort: number;
  toPort: number;
  trafficType: TrafficType;
  protocol: string;
  securityGroupId: string;
};

export type TrafficType = "ingress" | "egress";

export type endpointService = endpointServiceMap[];

type endpointServiceMap = {
  serviceName: string;
  endpointType: "Interface" | "Gateway";
};
