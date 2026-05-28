import { AST } from "vue-eslint-parser";
import { isChinese, isContain, mergeRuleListeners } from "../../libs";
import { getSourceDescMap } from "../../libs/source-desc-parser";
import { ASTNode, GetRuleListenerContext, VueListenerRule } from "../../types";
import { getJsxRuleListener } from "./get-jsx-rule-listener";
import { I18nFixerManager } from "./i18n-fixer-manager";
import { insertGlobalImportAndHooks } from "./i18n-source-handler";

const genForceQuoteInjectListener = (ctx: GetRuleListenerContext) => {
  // 在vue的template中，<div :name="`中文`" />进行国际化时，需要使用和属性相反的引号
  const injectForceQuote = (node: ASTNode) => {
    const nodeStr = ctx.sourceCode.getText(node as any) || "";
    if (nodeStr.startsWith("'")) {
      ctx.forceQuote = '"';
    } else {
      ctx.forceQuote = "'";
    }
  };
  return {
    VEndTag() {
      ctx.forceQuote = undefined;
    },
    VExpressionContainer: injectForceQuote,
  };
};

export const getVueTemplateListener = (ctx: GetRuleListenerContext) => {
  const i18nFixerManager = new I18nFixerManager(ctx);
  const { listener: scriptVisitor, globalInject } = getJsxRuleListener(
    ctx,
    i18nFixerManager,
    true
  );
  const forceQuoteInjectListener = genForceQuoteInjectListener(ctx);
  const { context } = ctx;
  let firstStartTag: AST.VStartTag;
  let hasLocaled = false;
  let hasInsert = false;
  const sourceDescMap = getSourceDescMap(context);

  const triggerLocaleCb = (curNode: ASTNode) => {
    const templateEle = firstStartTag.parent.parent;
    if (!templateEle || !isContain(templateEle as any, curNode as any)) return;
    hasLocaled = true;
  };

  const templateVisitor: VueListenerRule = {
    VStartTag(node: AST.VStartTag) {
      if (firstStartTag) return;
      ctx.inVueTemplate = true;
      firstStartTag = node;
      ctx.i18nCalleeNameStack.push(sourceDescMap.template.locale.name);
      i18nFixerManager.lifecycle.on("onLocale", triggerLocaleCb);
    },
    VEndTag(node) {
      if (node !== firstStartTag.parent.endTag) return;
      ctx.inVueTemplate = false;
      i18nFixerManager.lifecycle.off("onLocale", triggerLocaleCb);
      ctx.i18nCalleeNameStack.pop();
      const program = ctx.program;
      if (!program || !hasLocaled || hasInsert) return;
      hasInsert = true;
      const insertImports = [...globalInject.import]
        .concat(sourceDescMap.template.import)
        .filter(Boolean);
      const insertHooks = [...globalInject.hooks]
        .concat(sourceDescMap.template.hook)
        .filter(Boolean);

      insertGlobalImportAndHooks({
        ctx,
        insertImports,
        insertHooks,
      });
    },

    VText(node: AST.VText) {
      const val = node.value;
      if (!isChinese(val)) return;
      i18nFixerManager.trigger({
        node,
        prefix: "{{",
        suffix: "}}",
        trim: true,
      });
    },
    VLiteral(node: AST.VLiteral) {
      const val = node.value;
      if (!isChinese(val)) return;
      i18nFixerManager.trigger({
        node,
        prefix: '"',
        suffix: '"',
        quote: "'",
      });
    },
    VIdentifier(node: AST.VIdentifier) {
      const pNode = node.parent;
      if (pNode.type !== "VAttribute") return;
      const valIsChinese =
        pNode.value &&
        pNode.value.type === "VLiteral" &&
        isChinese(pNode.value.value);
      if (!valIsChinese) return;
      i18nFixerManager.trigger({
        node: node,
      });
    },
  };
  return mergeRuleListeners(
    forceQuoteInjectListener,
    templateVisitor,
    scriptVisitor
  );
};
