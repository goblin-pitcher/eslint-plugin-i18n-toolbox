#!/usr/bin/env node

const { existsSync } = require("fs");
const { resolve } = require("path");
const parser = require("yargs-parser");
const {
  collectMessage,
  i18nConfigInit,
  eslintConfigInit,
  startLint,
  configFileName,
} = require("../lib/tools");

const { _: commands, ...config } = parser(process.argv.slice(2), {
  // 配置暂时只支持配置文件
  alias: {},
});

if (commands[0] === "init") {
  if (config.eslint) {
    eslintConfigInit();
  } else {
    i18nConfigInit();
  }
}

if (commands[0] === "collect") {
  collectMessage({ useEslintrc: true });
}

const lintFunc = () => {
  return startLint(
    { fix: true, useEslintrc: true },
    {
      afterLint({ ESLint, results }) {
        return ESLint.outputFixes(results);
      },
    },
  );
};

if (commands[0] === "lint") {
  lintFunc();
}

if (commands[0] === "flow") {
  const flow = async () => {
    if (!existsSync(resolve(process.cwd(), configFileName))) {
      await i18nConfigInit();
    }
    await collectMessage();
    setTimeout(() => {
      lintFunc();
    }, 500);
  };
  flow();
}
