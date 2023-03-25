import { ConfigType, stageType } from "./types";
import { devConfig } from "./dev";

// TODO stagingとproductionを作る際に@ts-ignoreを削除する
const configMap: { [key in stageType]: ConfigType } = {
  dev: devConfig,
  // @ts-ignore
  staging: {},
  // @ts-ignore
  prduction: {},
};

export const getConfig = (stage: stageType): ConfigType => {
  return configMap[stage];
};
