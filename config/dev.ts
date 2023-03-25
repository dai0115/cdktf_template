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
};
