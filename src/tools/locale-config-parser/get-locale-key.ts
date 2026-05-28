import { getData } from "../../libs";
import { getConfig } from "../get-config";
import { GetLocaleKey } from "../types";
import { localeKeyMapper } from "./locale-data";
import { getSubFilePath } from "./utils";
import { parseKeyPathInfo } from "./write-locale-file";

const genGetLocaleKey: () => GetLocaleKey = () => {
  const config = getConfig();
  const { root, common, getLocaleKey: customGetLocaleKey } = config.locale;
  const commonKey = common.keyName;
  return (filePath, word) => {
    if (typeof customGetLocaleKey === "function")
      return customGetLocaleKey(filePath, word);
    const keyPath = getSubFilePath(root, filePath);
    if (!keyPath.length) return "";
    const { path } = parseKeyPathInfo(keyPath, config.locale, root);
    const cache = localeKeyMapper.getCache();
    const tapWord = getData(cache, [...path, word]);
    if (tapWord) return tapWord;
    return cache[commonKey]?.[word] ?? "";
  };
};
export const getLocaleKey = genGetLocaleKey();
