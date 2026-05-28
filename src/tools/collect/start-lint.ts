import { existsSync } from "fs";
import { ESLint } from "eslint";
import { cwdFileName } from "../../libs";
import { getConfig } from "../get-config";
import { MaybePromise } from "../types";

interface LintCtx {
  options: Partial<ESLint.Options>;
  lintSrc: string[];
  eslint: ESLint;
  ESLint: typeof ESLint;
}

interface LintLifecycle {
  beforeLint?: (ctx: LintCtx) => MaybePromise<void>;
  afterLint?: (
    ctx: LintCtx & { results: ESLint.LintResult[] }
  ) => MaybePromise<void>;
}

export const startLint = async (
  lintOptions?: Partial<ESLint.Options>,
  lifecycle?: LintLifecycle
) => {
  const config = getConfig();
  const options: ESLint.Options = {
    cwd: cwdFileName(""),
    ...(lintOptions || {}),
  };

  const { beforeLint, afterLint } = lifecycle || {};
  if (config.init.output && existsSync(config.init.output)) {
    options.overrideConfigFile = config.init.output;
  }

  const eslint = new ESLint(options);
  const { input = "src", customSuffix } = config.collect ?? {};
  const inputArr = ([] as string[]).concat(input);
  const lintSrc = customSuffix
    ? inputArr
    : inputArr.map((prefix) => `${prefix}/**/*.{vue,ts,js,tsx}`);
  const ctx: LintCtx = {
    options,
    lintSrc,
    eslint,
    ESLint,
  };
  await beforeLint?.(ctx);
  const results = await eslint.lintFiles(lintSrc);
  await afterLint?.({
    ...ctx,
    results,
  });
};
