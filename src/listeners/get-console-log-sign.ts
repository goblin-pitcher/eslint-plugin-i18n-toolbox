import { TSESTree } from "@typescript-eslint/utils";
import { getRuleConfig } from "../libs";
import { GetRuleListener, GetRuleListenerContext } from "../types";

export const ignoreValidate = (ctx: GetRuleListenerContext) => {
  const ruleConfig = getRuleConfig(ctx.context);
  return ruleConfig.ignoreConsole && !!ctx.inConsole;
};

export const getConsoleLogSign: GetRuleListener = (ctx) => {
  let logGrade = 0;
  const isConsoleLog = (node: TSESTree.Node) => {
    if (node.type !== "CallExpression") return false;
    const { callee } = node;
    if (callee.type !== "MemberExpression") return false;
    if (callee.object.type !== "Identifier") return false;
    if (callee.object.name !== "console") return false;
    return true;
  };
  return {
    CallExpression(node) {
      if (isConsoleLog(node)) {
        logGrade += 1;
      }
      ctx.inConsole = logGrade > 0;
    },
    "CallExpression:exit": function (node) {
      if (isConsoleLog(node)) {
        logGrade = Math.max(0, logGrade - 1);
      }
      ctx.inConsole = logGrade > 0;
    },
  };
};
