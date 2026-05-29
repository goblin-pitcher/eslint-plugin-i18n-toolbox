import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { RuleReportEvent } from "../../events";
import { i18nContextParser, isChinese, mergeRuleListeners } from "../../libs";
import { getCallExpressionCollect } from "../../listeners/get-call-expression-collect";
import { getConsoleLogSign } from "../../listeners/get-console-log-sign";
import { GetRuleListenerContext } from "../../types";
import { I18nFixerManager } from "./i18n-fixer-manager";
import {
  injectI18nSourceInfo,
  insertGlobalImportAndHooks,
} from "./i18n-source-handler";

export const getJsxRuleListener = (
  ctx: GetRuleListenerContext,
  i18nFixerManager?: I18nFixerManager,
  manualInsert?: boolean
) => {
  if (!i18nFixerManager) {
    i18nFixerManager = new I18nFixerManager(ctx);
  }
  const callExpressionCollector = getCallExpressionCollect(ctx);
  const consoleLogSign = getConsoleLogSign(ctx);
  const { listener: extraListener, globalInject } = injectI18nSourceInfo(
    ctx,
    i18nFixerManager
  );

  i18nContextParser.setContext(ctx);
  let hasInsert = false;
  const scriptVisitor: TSESLint.RuleListener = {
    "Program:exit"(node) {
      if (manualInsert || hasInsert) return;
      hasInsert = true;
      insertGlobalImportAndHooks({
        ctx,
        insertImports: [...globalInject.import],
        insertHooks: [...globalInject.hooks],
      });
    },
    Literal(node) {
      const val = node.value;
      const isI18nKey = i18nContextParser.checkIsI18nKey(node);
      if (isI18nKey) {
        i18nFixerManager.trigger({
          node,
        });
        return;
      }
      if (!isChinese(val)) return;
      let extraParams: Partial<RuleReportEvent> = {};
      if (node.parent.type === AST_NODE_TYPES.JSXAttribute) {
        extraParams = {
          prefix: "{",
          suffix: "}",
        };
      }
      if (
        node.parent.type === AST_NODE_TYPES.Property &&
        node.parent.key === node
      ) {
        extraParams = {
          prefix: "[",
          suffix: "]",
        };
      }
      i18nFixerManager.trigger({
        node,
        ...extraParams,
      });
    },
    JSXText(node) {
      const val = node.value;
      if (!isChinese(val)) return;
      i18nFixerManager.trigger({
        node,
        prefix: "{",
        suffix: "}",
        trim: true,
      });
    },
    TemplateLiteral(node) {
      const { quasis } = node;
      const isI18nKey = i18nContextParser.checkIsI18nKey(node);
      if (isI18nKey || quasis.some((item) => isChinese(item.value.cooked))) {
        i18nFixerManager.trigger({
          node,
        });
      }
    },
    Property(node) {
      const keyNode = node.key;
      if (
        !node.computed &&
        keyNode.type === AST_NODE_TYPES.Identifier &&
        isChinese(keyNode.name)
      ) {
        i18nFixerManager.trigger({
          node: keyNode,
          prefix: "[",
          suffix: "]",
        });
      }
    },
  };
  return {
    listener: mergeRuleListeners(
      extraListener,
      consoleLogSign,
      callExpressionCollector,
      scriptVisitor
    ),
    globalInject,
  };
};
