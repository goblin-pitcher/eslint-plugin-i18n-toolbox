import { getData } from "../../libs";
import { getConfig } from "../get-config";
import { GetLocaleValue } from "../types";
import { localeData } from "./locale-data";

const genGetLocaleValue: () => (
  key: string
) => ReturnType<GetLocaleValue> = () => {
  const config = getConfig();
  const { getLocaleValue } = config.locale;
  return (key) => {
    const cache = localeData.getCache();
    if (typeof getLocaleValue === "function") {
      return getLocaleValue(cache, key);
    }
    const path = key.split(".").filter(Boolean);
    const findData = getData(cache, path);
    if (typeof findData === "string") return findData;
    return "";
  };
};
export const getLocaleValue = genGetLocaleValue();
