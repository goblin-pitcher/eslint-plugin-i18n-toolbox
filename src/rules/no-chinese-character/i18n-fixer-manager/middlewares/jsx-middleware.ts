import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { Executor, getReportEventInfo } from "../../../../events";
import {
  getTrimStrInfo,
  i18nContextParser,
  isVirtualNode,
  stringLiteralParse,
} from "../../../../libs";
import { ignoreValidate } from "../../../../listeners/get-console-log-sign";
import { collectCache } from "../../../../tools/collect";
import {
  getLocaleKey,
  getLocaleValue,
} from "../../../../tools/locale-config-parser";
import { GetRuleListenerContext } from "../../../../types";
import { messageIds } from "../../constants";

const literalHandlerTypeSet = new Set([
  AST_NODE_TYPES.Literal,
  AST_NODE_TYPES.JSXText,
  AST_NODE_TYPES.Identifier,
  "VText",
  "VLiteral",
]);

const getForceQuote = (ctx: GetRuleListenerContext, customQuote: string) => {
  if (customQuote) return customQuote;
  return ctx.forceQuote;
};

const wrapperStr = (content: string, forceQuote?: string) => {
  return forceQuote
    ? `${forceQuote}${content}${forceQuote}`
    : JSON.stringify(content);
};

export const i18nKeyMiddleware: Executor = ({ ctx, reportEvent }) => {
  if (ignoreValidate(ctx)) return;
  const { node, isI18nKey, eventName } = reportEvent;
  if (!isI18nKey) return;
  const { context, filePath, sourceCode } = ctx;
  i18nContextParser.setContext(ctx);
  const { defaultMessage, commentNode } = i18nContextParser.getDefaultMessage();
  const { isStringLiteral: defMessageValid, text: defaultText } =
    stringLiteralParse(defaultMessage);
  const { isCollect } = getReportEventInfo(eventName);

  // 非注释的内容之前的操作已经收集过了
  if (isCollect && isVirtualNode(defaultMessage)) {
    collectCache.add(filePath, defaultText);
    return;
  }

  if (!defMessageValid && defaultMessage) {
    context.report({
      node: defaultMessage,
      messageId: messageIds.inValidDefaultMessage,
    });

    return;
  }

  const { commentDefaultMessage, revertCommentDefaultMessage } = ctx.config;
  if (
    !commentDefaultMessage &&
    revertCommentDefaultMessage &&
    isVirtualNode(defaultMessage) &&
    commentNode?.value
  ) {
    context.report({
      node: defaultMessage,
      messageId: messageIds.inValidDefaultMessage,
      fix(fixer) {
        let fixStr = commentNode.value || "";
        const [leftNode, rightNode] = i18nContextParser.findPropertyRoundRange(
          commentNode.range
        );
        if (leftNode) {
          const str = sourceCode
            .getText()
            .slice(leftNode.range[1], commentNode.range[0]);
          if (!str.includes(",")) {
            fixStr = `,${fixStr}`;
          }
        }
        if (rightNode) {
          const str = sourceCode
            .getText()
            .slice(commentNode.range[1], rightNode.range[0]);
          if (!str.includes(",")) {
            fixStr = `${fixStr},`;
          }
        }
        return fixer.replaceText(commentNode, fixStr);
      },
    });
  }

  if (commentDefaultMessage && !isVirtualNode(defaultMessage)) {
    const defMsgProperty = i18nContextParser.findDefaultMessageProperty();
    if (defMsgProperty) {
      context.report({
        node: defMsgProperty as any,
        messageId: messageIds.unableToFindValue,

        fix(fixer) {
          const replaceText = `/* ${sourceCode.getText(defMsgProperty)} */`;
          const [defMsgPrevProperty, defMsgNextProperty] =
            i18nContextParser.findPropertyRoundDefaultMessage();
          let rplRange = defMsgProperty.range;
          // {a: 1, defaultMessage: '123', b: 2}
          if (defMsgPrevProperty) {
            const str = sourceCode
              .getText()
              .slice(defMsgPrevProperty.range[1], defMsgProperty.range[0]);
            if (str.includes(",")) {
              rplRange[0] = defMsgPrevProperty.range[1];
            }
          }
          //  {defaultMessage: '123', b: 2}
          else if (defMsgNextProperty) {
            const str = sourceCode
              .getText()
              .slice(defMsgProperty.range[1], defMsgNextProperty.range[0]);
            if (str.includes(",")) {
              rplRange[1] = defMsgNextProperty.range[0];
            }
          }

          return fixer.replaceTextRange(rplRange, replaceText);
        },
      });
    }
  }

  const {
    isStringLiteral: keyValid,
    text: keyText,
    quote: keyQuote,
  } = stringLiteralParse(node);
  if (keyValid && keyText) {
    // key能找到中文就不报错
    if (getLocaleValue(keyText)) return;
  }

  context.report({
    node: node as any,
    messageId: messageIds.unableToFindValue,
    fix(fixer) {
      const { isInject } = getReportEventInfo(eventName);
      if (!isInject) return;
      const findKey = defaultText ? getLocaleKey(filePath, defaultText) : "";
      if (!findKey) return;
      return fixer.replaceText(node as any, `${keyQuote}${findKey}${keyQuote}`);
    },
  });
};

export const literalMiddleware: Executor = ({
  ctx,
  reportEvent,
  lifecycle,
}) => {
  if (ignoreValidate(ctx)) return;
  const {
    node,
    eventName,
    trim,
    quote: customQuote,
    i18nCalleeName,
    isDefaultMessage,
    isI18nKey,
  } = reportEvent;
  if (!literalHandlerTypeSet.has(node.type) || isI18nKey) return;
  let { prefix = "", suffix = "" } = reportEvent;
  const forceQuote = getForceQuote(ctx, customQuote);
  let val;
  if (node.type === AST_NODE_TYPES.Identifier) {
    val = node.name;
  } else {
    val = (node as any).value;
  }
  if (typeof val !== "string") return;
  const { context, filePath, defaultMessageKey } = ctx;

  if (!i18nCalleeName) return;
  const { isInject, isCollect } = getReportEventInfo(eventName);
  let content = val;
  if (trim) {
    const info = getTrimStrInfo(val);
    content = info.content;
    prefix = info.prefix + prefix;
    suffix = suffix + info.suffix;
  }
  if (isCollect) {
    collectCache.add(filePath, content);
    return;
  }
  if (isDefaultMessage) return;
  lifecycle.emit("onLocale", node);
  context.report({
    node: node as any,
    messageId: messageIds.noChinese,
    fix(fixer) {
      const keyStr = wrapperStr("", forceQuote);
      const contentStr = wrapperStr(content, forceQuote);
      const defMsgPropertyStr = `${defaultMessageKey}: ${contentStr}`;

      const replaceText = `${prefix}${i18nCalleeName}(${keyStr}, {${defMsgPropertyStr}})${suffix}`;
      return fixer.replaceText(node as any, replaceText);
    },
  });
};

export const templateLiteralMiddleware: Executor = ({
  ctx,
  reportEvent,
  lifecycle,
}) => {
  if (ignoreValidate(ctx)) return;
  const {
    node,
    eventName,
    trim,
    quote: customQuote,
    i18nCalleeName,
    isDefaultMessage,
    prefix = "",
    suffix = "",
  } = reportEvent;
  if (node.type !== AST_NODE_TYPES.TemplateLiteral) return;
  const forceQuote = getForceQuote(ctx, customQuote);
  const {
    context,
    filePath,
    sourceCode,
    defaultMessageKey,
    templateLiteralExpression,
  } = ctx;
  if (!i18nCalleeName) return;
  const { isInject, isCollect } = getReportEventInfo(eventName);
  const { expressions = [], quasis = [] } = node;
  const fullArr = [...quasis, ...expressions].sort(
    (a, b) => a.range[0] - b.range[0]
  );
  const { prefix: expPrefix = "{", suffix: expSuffix = "}" } =
    templateLiteralExpression || {};
  let index = 1;

  const content = fullArr.reduce((str, item) => {
    if (item.type === AST_NODE_TYPES.TemplateElement) {
      return str + item.value.cooked;
    }
    return str + `${expPrefix}value${index++}${expSuffix}`;
  }, "");

  if (isCollect) {
    collectCache.add(filePath, content);
    return;
  }
  if (isDefaultMessage) return;
  lifecycle.emit("onLocale", node);
  context.report({
    node: node as any,
    messageId: messageIds.noChinese,
    fix(fixer) {
      const extraParamsStr = expressions
        .map((item, idx) => {
          return `value${idx + 1}: ${sourceCode.getText(item)}`;
        })
        .join(", ");
      const fullExtraParamsStr = extraParamsStr ? `, ${extraParamsStr}` : "";
      const keyStr = wrapperStr("", forceQuote);
      const contentStr = wrapperStr(content, forceQuote);
      const defMsgPropertyStr = `${defaultMessageKey}: ${contentStr}`;
      const replaceText = `${prefix}${i18nCalleeName}(${keyStr}, {${defMsgPropertyStr}${fullExtraParamsStr}})${suffix}`;
      return fixer.replaceText(node as any, replaceText);
    },
  });
};
