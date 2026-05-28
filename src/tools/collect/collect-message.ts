import { ESLint } from "eslint";
import { requireJSON } from "../../libs";
import { innerRuleName } from "../config-init";
import { getConfig } from "../get-config";
import { writeLocaleFile } from "../locale-config-parser";
import { collectCache } from "./cache";
import { startLint } from "./start-lint";

export const collectMessage = async (options?: Partial<ESLint.Options>) => {
  const config = getConfig();
  await startLint(options || {}, {
    beforeLint: () => {
      collectCache.openCollect();
    },
  });
  const messageObj = collectCache.getCache();
  collectCache.reset();
  if (!Object.keys(messageObj).length) {
    console.error(
      `未检测到中文，请检查是否执行了i18n-toolbox collect指令，或在eslintrc中添加了${innerRuleName}规则`
    );
    return;
  }
  const oldFile = requireJSON(config.init.output);

  await writeLocaleFile(messageObj, oldFile);
};
