import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { ASTNode } from "../types";
import { unboxTSExpression } from "./ts-expression-handler";

export type CommonFunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export const isFunctionNode = (
  node: TSESTree.Node
): node is CommonFunctionNode => {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
};

export const collecFunctiontReturnStatements = (node: TSESTree.Node) => {
  const returnStatements: TSESTree.ReturnStatement[] = [];

  // Helper function to collect ReturnStatement nodes
  function findReturnStatements(body: TSESTree.BlockStatement["body"]) {
    body.forEach((childNode) => {
      if (childNode.type === "ReturnStatement") {
        returnStatements.push(childNode);
      } else if (childNode.type === "BlockStatement") {
        findReturnStatements(childNode.body);
      } else if (childNode.type === "IfStatement") {
        if (childNode.consequent) {
          findReturnStatements([].concat(childNode.consequent));
        }
        if (childNode.alternate) {
          findReturnStatements([].concat(childNode.alternate));
        }
      }
      // Add more cases as needed to handle different control structures
    });
  }

  if (isFunctionNode(node)) {
    if (node.body && node.body.type === "BlockStatement") {
      findReturnStatements(node.body.body);
    }
  }

  return returnStatements;
};

export const getCallExpressionName = (
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
) => {
  if (node && node.type === AST_NODE_TYPES.CallExpression)
    return sourceCode.getText(unboxTSExpression(node.callee));
  return "";
};

const getVarDeclaratorCallExpName = (
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
) => {
  if (node.type !== AST_NODE_TYPES.VariableDeclarator) return "";
  const validInit = unboxTSExpression(node.init);
  return getCallExpressionName(validInit, sourceCode);
};

export const getVarDeclarationCallExpNames = (
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
) => {
  if (node.type !== AST_NODE_TYPES.VariableDeclaration) return [];
  return node.declarations
    .map((declaration) => {
      return getVarDeclaratorCallExpName(declaration, sourceCode);
    })
    .filter(Boolean);
};

export const isContain = (pnode: TSESTree.Node, node: TSESTree.Node) => {
  if (!pnode || !node) return false;
  const range1 = pnode.range;
  const range2 = node.range;
  return range1[0] <= range2[0] && range1[1] >= range2[1];
};

// 只解析纯字符串： "xxx" `xxx` "xxx" 这几种
export const stringLiteralParse = (node: ASTNode) => {
  const defResult = {
    isStringLiteral: false,
    text: "",
    quote: "",
  };
  if (!node) return defResult;
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") {
    return {
      isStringLiteral: true,
      text: node.value,
      quote: node.raw[0],
    };
  }
  if (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    !node.expressions.length &&
    node.quasis.length === 1
  ) {
    return {
      isStringLiteral: true,
      text: node.quasis[0].value.cooked,
      quote: "`",
    };
  }
  return defResult;
};

const virtualNodeBase = {
  range: [-1, -1] as [number, number],
  loc: {
    start: { line: -1, column: -1 },
    end: { line: -1, column: -1 },
  },
};

export const createStringLiteral = (str: string): TSESTree.StringLiteral => ({
  type: AST_NODE_TYPES.Literal,
  value: str,
  raw: `"${str}"`,
  ...virtualNodeBase,
  parent: null,
});

export const isVirtualNode = (node: TSESTree.Node) => {
  return (node?.range ?? []).every((val) => val < 0);
};
