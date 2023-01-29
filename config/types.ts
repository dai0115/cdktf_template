export type stageType = "dev" | "staging" | "prduction";

export const appName = "project";

type prefix = `project-${stageType}`;

export type ConfigType = {
  region: string;
  prefix: prefix;
  stage: stageType;
  appName: typeof appName;
  vpcConfig: VpcConfig;
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
