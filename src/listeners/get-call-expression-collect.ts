import { GetRuleListener } from "../types";

export const getCallExpressionCollect: GetRuleListener = (ctx) => {
  const callExpNodes = ctx.upperCallExpressionStack;
  return {
    CallExpression(node) {
      callExpNodes.push(node);
    },
    "CallExpression:exit": function () {
      callExpNodes.pop();
    },
  };
};
