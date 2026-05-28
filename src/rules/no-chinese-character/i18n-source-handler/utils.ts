import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { SourceDescItemWithText, uniqueArr } from "../../../libs";

export const getFixText = (arr: SourceDescItemWithText[]) =>
  uniqueArr(arr.map((it) => it.text).filter(Boolean)).join("");

export const isSetupProperty = (node: TSESTree.Node) => {
  if (!node || !node.parent) return false;
  const pNode = node.parent;
  if (pNode.type === AST_NODE_TYPES.Property) {
    return (
      pNode.key.type === AST_NODE_TYPES.Identifier && pNode.key.name === "setup"
    );
  }
  return false;
};
