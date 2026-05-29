import { cwdFileName, merge, requireJSON } from "../libs";
import { I18nToolboxConfig } from "./types";

export const configFileName = "i18n-toolbox.config.js";
export const getConfig = (isRelative?: boolean) => {
  const defConfig: I18nToolboxConfig = {
    eslintrc: [".eslintrc"],
    collect: {
      input: "./src",
    },
    init: {
      output: "i18n-toolbox.eslintrc.js",
    },
    locale: {
      output: "./locales/zh-CN.json",
      defaultOutputExt: "json",
      root: "./src",
      common: {
        keyName: "common",
        minTimes: 2,
      },
      poll: 3000,
      override: false,
      split: true,
      splitKeyReplacer: "-",
    },
  };
  const configFilePath = cwdFileName(configFileName);
  const config = requireJSON(configFilePath) as I18nToolboxConfig;
  const fullConfig = merge(defConfig, config) as I18nToolboxConfig;

  fullConfig.eslintrc = config.eslintrc
    ? ([] as string[]).concat(config.eslintrc)
    : defConfig.eslintrc;
  if (isRelative) return fullConfig;

  fullConfig.locale.output = cwdFileName(fullConfig.locale.output);
  fullConfig.locale.root = cwdFileName(fullConfig.locale.root);
  fullConfig.init.output = cwdFileName(fullConfig.init.output);
  return fullConfig;
};
