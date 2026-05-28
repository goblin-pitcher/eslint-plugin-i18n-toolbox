import { TSESLint } from "@typescript-eslint/utils";
import { isFunctionNode } from "./function-node-handler";

export const isFunctionInScope = (
  scope: TSESLint.Scope.Scope,
  functionName: string
) => {
  const name = functionName;
  if (!name) return null;
  let activeScope = scope;
  while (activeScope) {
    if (activeScope.set.has(name)) {
      const val = activeScope.set.get(name);
      const checkNode = val.defs[0].node;
      return isFunctionNode(checkNode) && checkNode.id.name === functionName;
    }
    activeScope = activeScope.upper;
  }
  return false;
};
