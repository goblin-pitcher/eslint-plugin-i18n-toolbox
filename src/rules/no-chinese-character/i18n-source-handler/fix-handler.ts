import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import {
  uniqueArr,
  CommonFunctionNode,
  getVarDeclarationCallExpNames,
  filterValidImportDescItem,
  SourceDescItemWithText,
  collecFunctiontReturnStatements,
} from "../../../libs";
import { GetRuleListenerContext } from "../../../types";
import { messageIds } from "../constants";
import { getFixText } from "./utils";

export const addPropertyFixer = (options: {
  ctx: GetRuleListenerContext;
  node: TSESTree.Node;
  hookSourceDesc: SourceDescItemWithText | SourceDescItemWithText[];
}) => {
  const { ctx, node, hookSourceDesc } = options || {};
  if (node?.type !== AST_NODE_TYPES.ObjectExpression) return;
  const keyNameSet = new Set(
    (node.properties || [])
      .map((it) => {
        if (it.type !== AST_NODE_TYPES.Property) return "";
        if (it.key.type !== AST_NODE_TYPES.Identifier) return "";
        return it.key.name;
      })
      .filter(Boolean)
  );
  const needInsertHooks = ([] as SourceDescItemWithText[])
    .concat(hookSourceDesc)
    .filter((it) => !keyNameSet.has(it?.key));

  if (!needInsertHooks.length) return;
  const needInsertStr =
    needInsertHooks.map((item) => item.key).join(",\n") + "\n";
  ctx.context.report({
    node,
    messageId: messageIds.addI18nProperty,
    fix(fixer) {
      return fixer.insertTextBeforeRange(
        [node.range[1] - 1, node.range[1]],
        needInsertStr
      );
    },
  });
};

export const vueConfigSetupI18nExpose = (options: {
  ctx: GetRuleListenerContext;
  node?: CommonFunctionNode;
  hookSourceDesc: SourceDescItemWithText | SourceDescItemWithText[];
}) => {
  const { ctx, node, hookSourceDesc } = options || {};
  const vueSetupNode = node || ctx.setup;
  if (!vueSetupNode) return;
  const returnNodes = collecFunctiontReturnStatements(vueSetupNode);
  returnNodes.forEach((nd) => {
    addPropertyFixer({ ctx, node: nd.argument, hookSourceDesc });
  });
};

export const functionHookFixer = ({
  ctx,
  node,
  hookSourceDesc,
}: {
  ctx: GetRuleListenerContext;
  node: CommonFunctionNode;
  hookSourceDesc?: SourceDescItemWithText | SourceDescItemWithText[];
}) => {
  const sourceCode = ctx.sourceCode;
  const allHooksInfo = uniqueArr(
    ([] as SourceDescItemWithText[]).concat(hookSourceDesc).filter(Boolean)
  );
  if (!allHooksInfo.length || node.body.type !== AST_NODE_TYPES.BlockStatement)
    return;
  const allDeclarationCallNameSet = new Set(
    node.body.body.reduce((arr, exp) => {
      const nameArr = getVarDeclarationCallExpNames(exp, sourceCode);
      return arr.concat(nameArr);
    }, [] as string[])
  );

  const insertHooksInfo = allHooksInfo.filter(
    (item) => item.name && !allDeclarationCallNameSet.has(item.name)
  );

  if (!insertHooksInfo.length) return;
  if (node.body.type !== AST_NODE_TYPES.BlockStatement) return;
  const ele = node.body.body[0];
  ctx.context.report({
    node: ele,
    messageId: messageIds.addHookBeforeIt,
    fix(fixer) {
      return fixer.insertTextBefore(ele, getFixText(insertHooksInfo));
    },
  });
};

export const insertGlobalImportAndHooks = ({
  ctx,
  insertImports,
  insertHooks,
}: {
  ctx: GetRuleListenerContext;
  insertImports: SourceDescItemWithText[];
  insertHooks: SourceDescItemWithText[];
}) => {
  const { context, sourceCode } = ctx;
  const programNode = ctx.program;
  const setupNode = ctx.setup;
  const insertEle =
    programNode.body.find(
      (el) => el.type !== AST_NODE_TYPES.ImportDeclaration
    ) ||
    programNode.body?.[0] ||
    programNode;
  if (!insertEle) return;
  const insertRange = insertEle.range;
  const validImportItems = filterValidImportDescItem(
    programNode.body,
    insertImports
  );
  const allNames = new Set(
    programNode.body
      .map((exp) => {
        return getVarDeclarationCallExpNames(exp, sourceCode);
      })
      .flat()
  );

  const resHooks = insertHooks.filter((it) => !allNames.has(it.name));
  const programInsertText = getFixText(
    setupNode ? validImportItems : [...validImportItems, ...resHooks]
  );
  if (programInsertText) {
    context.report({
      node: insertEle,
      messageId: messageIds.addImportBeforeIt,
      fix(fixer) {
        return fixer.insertTextBeforeRange(insertRange, programInsertText);
      },
    });
  }
  if (resHooks.length && ctx.setup) {
    functionHookFixer({ ctx, node: ctx.setup, hookSourceDesc: resHooks });
    vueConfigSetupI18nExpose({
      ctx,
      node: ctx.setup,
      hookSourceDesc: resHooks,
    });
  }
};
