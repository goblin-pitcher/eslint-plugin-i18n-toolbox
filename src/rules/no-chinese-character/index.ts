import { TSESLint } from "@typescript-eslint/utils";
import { defSource } from "../../constants";
import {
  getFileName,
  getRuleConfig,
  getSourceCode,
  merge,
  mergeRuleListeners,
  silenceVisitorDecorator,
  vueCompatiableDecorator,
} from "../../libs";
import {
  getSourceDescObj,
  sourceDescParser,
} from "../../libs/source-desc-parser";
import { GetRuleListenerContext, RuleConfig } from "../../types";
import { messages } from "./constants";
import { getJsxRuleListener } from "./get-jsx-rule-listener";
import { getVueTemplateListener } from "./get-vue-template-listener";

const intervalRule: TSESLint.RuleModule<string | undefined, RuleConfig[]> = {
  meta: {
    type: "problem", // `problem`, `suggestion`, or `layout`
    docs: {
      description: `no-chinese-character`,
      recommended: "recommended",
      url: null, // URL to the documentation page for this rule
    },
    fixable: "code", // Or `code` or `whitespace`
    schema: [
      {
        type: "object",
      },
    ], // Add a schema if the rule has options
    messages,
  },
  defaultOptions: [],
  create(context) {
    // variables should be defined here

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    // any helper functions should go here or else delete this section

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------
    const sourceCode = getSourceCode(context);
    const configRule = getRuleConfig(context);
    const sourceDescObj = getSourceDescObj(context);
    const defSourceDesc = sourceDescParser(sourceDescObj.default);
    const ctx: GetRuleListenerContext = {
      config: configRule,
      context,
      sourceCode,
      upperCallExpressionStack: [],
      i18nCalleeNameStack: [defSourceDesc.locale.name],
      filePath: getFileName(context, true),
      defaultMessageKey: configRule.defaultMessage || "defaultMessage",
      templateLiteralExpression: configRule.templateLiteralExpression || {
        prefix: "{",
        suffix: "}",
      },
      strictMode: configRule.strictMode,
    };
    const { listener: scriptVisitor } = getJsxRuleListener(ctx);
    const vueVisitor = getVueTemplateListener(ctx);
    const visitor = vueCompatiableDecorator(context, vueVisitor, scriptVisitor);
    const silence = ctx.config.silence;
    return silenceVisitorDecorator(visitor, !!silence, silence === "debug");
  },
};

module.exports = intervalRule;
