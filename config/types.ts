import { VpcConfig } from "@cdktf/provider-aws/lib/vpc";

export type stageType = "dev" | "staging" | "prduction";

type prefix = `application-${stageType}`;

// Stack毎に可変なプロパティを定義
export type ConfigType = {
  region: string;
  prefix: prefix;
  stage: stageType;
  network: NetworkConfig;
};

type NetworkConfig = {
  vpc: VpcConfig;
};
