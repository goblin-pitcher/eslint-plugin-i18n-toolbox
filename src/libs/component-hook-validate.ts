import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { isFunctionNode } from "./function-node-handler";
import { upperToNotTSNode } from "./ts-expression-handler";

export const getFunctionName = (node: TSESTree.Node) => {
  if (!isFunctionNode(node)) return "";
  let name = "";
  if (node.id) {
    name = node.id.name;
  } else {
    const pNode = upperToNotTSNode(node.parent);
    if (
      pNode.type === AST_NODE_TYPES.VariableDeclarator &&
      pNode.id.type === AST_NODE_TYPES.Identifier
    ) {
      name = pNode.id.name;
    } else if (
      pNode.type === AST_NODE_TYPES.AssignmentExpression &&
      pNode.left.type === AST_NODE_TYPES.Identifier
    ) {
      name = pNode.left.name;
    }
  }
  return name;
};

export const isJsxComponent = (node: TSESTree.Node) => {
  const name = getFunctionName(node);
  return !!(name && /^[A-Z]/.test(name));
};

export const isHook = (node: TSESTree.Node) => {
  const name = getFunctionName(node);
  return !!(name && /^use[A-Z]/.test(name));
};

export const isCompOrHook = (node: TSESTree.Node) => {
  return isJsxComponent(node) || isHook(node);
};
