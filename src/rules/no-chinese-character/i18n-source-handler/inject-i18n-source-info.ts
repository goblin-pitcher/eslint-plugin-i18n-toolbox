import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";
import {
  addDefToSet,
  i18nContextParser,
  isContain,
  isHook,
  isJsxComponent,
  isFunctionNode,
  getScriptInfo,
  getSourceDescMap,
  SourceDescItemWithText,
} from "../../../libs";
import { GetRuleListenerContext } from "../../../types";
import { vueDefHandlerFuncNameSet } from "../constants";
import { I18nFixerManager } from "../i18n-fixer-manager";
import { functionHookFixer } from "./fix-handler";
import { isSetupProperty } from "./utils";

const genDefHandlerListener = (
  ctx: GetRuleListenerContext,
  i18nFixerManager: I18nFixerManager,
  globalImportSet: Set<SourceDescItemWithText>
) => {
  const { context } = ctx;
  const sourceDescMap = getSourceDescMap(context);
  const { isSetupScript } = getScriptInfo(context);
  const isInValid = (node: TSESTree.CallExpression) => {
    return (
      !isSetupScript ||
      node.callee.type !== AST_NODE_TYPES.Identifier ||
      !vueDefHandlerFuncNameSet.has(node.callee.name)
    );
  };
  let hasTriggeredLocale = false;
  let curNode: TSESTree.Node | null = null;
  const trigggerLocaleCallback = (node: TSESTree.Node) => {
    hasTriggeredLocale = true;
  };
  const callExpListener: TSESLint.RuleListener = {
    CallExpression(node) {
      if (isInValid(node)) return;
      if (!curNode) {
        curNode = node;
        hasTriggeredLocale = false;
        i18nFixerManager.lifecycle.on("onLocale", trigggerLocaleCallback);
      }
      ctx.i18nCalleeNameStack.push(sourceDescMap.default?.locale?.name);
    },
    "CallExpression:exit"(node) {
      if (isInValid(node)) return;
      ctx.i18nCalleeNameStack.pop();
      i18nFixerManager.lifecycle.off("onLocale", trigggerLocaleCallback);
      if (hasTriggeredLocale) {
        addDefToSet(globalImportSet, sourceDescMap.default?.import);
      }
      curNode = null;
      hasTriggeredLocale = false;
    },
  };
  return callExpListener;
};

export const injectI18nSourceInfo = (
  ctx: GetRuleListenerContext,
  i18nFixerManager: I18nFixerManager
) => {
  i18nContextParser.setContext(ctx);
  const { context, sourceCode } = ctx;
  const sourceDescMap = getSourceDescMap(ctx.context);
  const { isVueFile: isVue, isSetupScript } = getScriptInfo(context);
  const globalImportSet = new Set<SourceDescItemWithText>();
  const globalHookSet = new Set<SourceDescItemWithText>();

  /**
   * =========================export default {}形式的vue组件=========================
   */
  let isVueConfigComponent = false;
  const exportDefaultListener = {
    ExportDefaultDeclaration() {
      if (!isVue || isSetupScript) return;
      isVueConfigComponent = true;
    },
    "ExportDefaultDeclaration:exit"() {
      isVueConfigComponent = false;
    },
  };
  /**
   * =========================处理组件和钩子===================================
   */
  let compHookTriggerLocale = false;
  let compHookNode: TSESTree.Node | null = null;
  const trigggerLocaleCallback = (curNode: TSESTree.Node) => {
    if (!isContain(compHookNode, curNode)) return;
    compHookTriggerLocale = true;
  };

  const enter = (node: TSESTree.Node) => {
    if (!isFunctionNode(node)) return;
    const compOrHookHandler = () => {
      if (!compHookNode) {
        compHookNode = node;
        compHookTriggerLocale = false;
        i18nFixerManager.lifecycle.on("onLocale", trigggerLocaleCallback);
      }
    };
    if (isVueConfigComponent && isSetupProperty(node)) {
      ctx.setup = node;
      ctx.i18nCalleeNameStack.push(sourceDescMap.vueComponent?.locale.name);
      compOrHookHandler();
    } else if (isJsxComponent(node)) {
      ctx.i18nCalleeNameStack.push(sourceDescMap.component?.locale.name);
      compOrHookHandler();
    } else if (isHook(node)) {
      ctx.i18nCalleeNameStack.push(sourceDescMap.hooks?.locale.name);
      compOrHookHandler();
    }
  };
  const exit = (node: TSESTree.Node) => {
    if (!isFunctionNode(node)) return;
    // releaseHandlers.forEach((fn) => fn());
    if (
      (isVueConfigComponent && isSetupProperty(node)) ||
      isJsxComponent(node) ||
      isHook(node)
    ) {
      ctx.i18nCalleeNameStack.pop();
    }
    if (node !== compHookNode) return;
    const hasTriggerLocale = compHookTriggerLocale;

    i18nFixerManager.lifecycle.off("onLocale", trigggerLocaleCallback);
    compHookNode = null;
    compHookTriggerLocale = false;
    const fixHandler = (hookSourceDesc?: SourceDescItemWithText) => {
      functionHookFixer({ ctx, node, hookSourceDesc });
    };
    if (hasTriggerLocale) {
      if (isVueConfigComponent && isSetupProperty(node)) {
        addDefToSet(globalImportSet, sourceDescMap.vueComponent?.import);
        fixHandler(sourceDescMap.vueComponent?.hook);
      } else if (isJsxComponent(node)) {
        addDefToSet(globalImportSet, sourceDescMap.component?.import);
        fixHandler(sourceDescMap.component?.hook);
      } else if (isHook(node)) {
        addDefToSet(globalImportSet, sourceDescMap.hooks?.import);
        fixHandler(sourceDescMap.hooks?.hook);
      }
    }
  };

  /** ==================================特殊处理vue的props相关方法====================================== */
  const vueDefHandlerListener = genDefHandlerListener(
    ctx,
    i18nFixerManager,
    globalImportSet
  );
  /** ==================================特殊处理vue的props相关方法-end====================================== */

  let hasTriggerOutside = false;

  const triggerLocaleOutsideCb = (curNode: any) => {
    hasTriggerOutside = true;
  };
  const extraListener: TSESLint.RuleListener = {
    ...exportDefaultListener,
    Program(node) {
      ctx.program = node;
      ctx.setup = null;
      hasTriggerOutside = false;
      i18nFixerManager.lifecycle.on("onLocale", triggerLocaleOutsideCb);
      if (isSetupScript) {
        ctx.i18nCalleeNameStack.push(sourceDescMap.vueComponent?.locale?.name);
      }
    },
    "Program:exit"() {
      i18nFixerManager.lifecycle.off("onLocale", triggerLocaleOutsideCb);
      if (isSetupScript) {
        ctx.i18nCalleeNameStack.pop();
        if (hasTriggerOutside) {
          addDefToSet(globalImportSet, sourceDescMap.vueComponent?.import);
          if (isSetupScript) {
            addDefToSet(globalHookSet, sourceDescMap.vueComponent?.hook);
          }
        }
      } else {
        if (hasTriggerOutside) {
          addDefToSet(globalImportSet, sourceDescMap.default?.import);
        }
      }
    },
    FunctionDeclaration: enter,
    "FunctionDeclaration:exit": exit,
    FunctionExpression: enter,
    "FunctionExpression:exit": exit,
    ArrowFunctionExpression: enter,
    "ArrowFunctionExpression:exit": exit,
    ...vueDefHandlerListener,
  };
  return {
    listener: extraListener,
    globalInject: {
      import: globalImportSet,
      hooks: globalHookSet,
    },
  };
};
