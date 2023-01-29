import { ConfigType, stageType } from "./types";
import { devConfig } from "./dev";

// TODO: 検証・本番を追加するタイミングでts-ignoreは削除する
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
