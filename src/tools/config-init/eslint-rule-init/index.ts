import { writeFileSync } from "fs";
import { Linter } from "@typescript-eslint/utils/ts-eslint";
import { ESLint } from "eslint";
import { merge } from "../../../libs";
import { getConfig } from "../../get-config";
import { getTypicalFiles } from "./get-typical-files";

export const innerRuleName = "i18n-toolbox/no-chinese-character";

export const getOverrideLintFile = async () => {
  const config = getConfig();
  const arr = await getTypicalFiles();
  const eslint = new ESLint({
    cwd: process.cwd(),
  });
  const resArr = await Promise.all(
    arr.map((file) => eslint.calculateConfigForFile(file))
  );
  const allRulesKey = merge(
    ...resArr.map((res) => Object.keys(res.rules || {}))
  );
  const newRules = {
    [innerRuleName]: "error",
    ...Object.fromEntries(
      allRulesKey
        .filter((ruleKey) => ruleKey !== innerRuleName)
        .map((ruleKey) => [ruleKey, "off"])
    ),
  } as Partial<Linter.RulesRecord>;

  const defObj = {
    extends: config.eslintrc,
    plugins: ["i18n-toolbox"],
    rules: newRules,
  };
  return defObj;
};

export const getOverrideLintConfig = async () => {
  const overrideRules = await getOverrideLintFile();
  return {
    plugins: overrideRules.plugins as any,
    rules: {
      ...overrideRules.rules,
    },
  };
};
export const eslintConfigInit = async () => {
  const config = getConfig();
  const defObj = await getOverrideLintFile();
  if (!config.init.output) {
    throw new Error("eslint规则文件未指定输出目录");
  }
  writeFileSync(
    config.init.output,
    `module.exports = ${JSON.stringify(defObj, null, 2)}`,
    "utf-8"
  );
  console.log("国际化lint配置文件注入完毕");
};
