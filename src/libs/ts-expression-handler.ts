/**
 * 主要处理ts表表达式相关内容
 */
import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";

type Get<T, K extends keyof T> = T[K];
// 参考TSESTree.Expression类型中TS开头的类型
type TSNode =
  | TSESTree.TSAsExpression
  | TSESTree.TSInstantiationExpression
  | TSESTree.TSNonNullExpression
  | TSESTree.TSSatisfiesExpression
  | TSESTree.TSTypeAssertion;

type TSNodeType = Get<TSNode, "type">;

type TSExpressionNode = Get<TSNode, "expression">;

const tsExpressionSet: Set<TSNodeType> = new Set([
  AST_NODE_TYPES.TSAsExpression,
  AST_NODE_TYPES.TSInstantiationExpression,
  AST_NODE_TYPES.TSNonNullExpression,
  AST_NODE_TYPES.TSSatisfiesExpression,
  AST_NODE_TYPES.TSTypeAssertion,
]);

export const gotoValidParent = (
  node: TSESTree.Node,
  isInValid: (nd: TSESTree.Node) => boolean,
  maxCount = 5000
) => {
  let p = node;
  let count = 0;
  while (p && isInValid(p) && count < maxCount) {
    p = p.parent;
    count += 1;
  }
  return p;
};

export const isTSExpression = (node: TSESTree.Node): node is TSNode => {
  return node && tsExpressionSet.has(node.type as TSNodeType);
};

export const unboxTSExpression = <T extends TSESTree.Node>(
  node: T
): T | TSExpressionNode | null => {
  if (isTSExpression(node)) {
    return unboxTSExpression(node.expression);
  }
  return node;
};

export const upperToNotTSNode = (node: TSESTree.Node) =>
  gotoValidParent(node, isTSExpression);
