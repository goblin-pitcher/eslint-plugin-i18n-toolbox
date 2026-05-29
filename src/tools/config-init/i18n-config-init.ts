import { cwdFileName, merge, promiseWriteFile } from "../../libs";
import { configFileName, getConfig } from "../get-config";
import { I18nToolboxConfig } from "../types";

export const i18nConfigInit = () => {
  const baseConfig = getConfig(true);
  const overrideConfig = {
    locale: {
      hashKey: 8,
    } as I18nToolboxConfig["locale"],
  };
  const configFilePath = cwdFileName(configFileName);
  const content = `module.exports = ${JSON.stringify(
    merge(overrideConfig, baseConfig),
    null,
    2
  )}`;
  return promiseWriteFile(configFilePath, content);
};
