/**
 * 处理i18n相关判定，如是hook是否添加、impoort是否导入，当前节点和i18n方法之间的关系
 */

import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { GetRuleListenerContext } from "../types";
import { binaryFindLeftBorder, getLastItem } from "./common";
import {
  createStringLiteral,
  getCallExpressionName,
  isContain,
} from "./function-node-handler";

const findCommentsInNode = (
  comments: TSESTree.Comment[],
  node: TSESTree.Node
) => {
  // 从注释里找,二分查找找到被i18nConfigObjNode包裹的注释，从中找到defaultMessage关键词
  if (!node || !comments?.length) return [];
  // 注意，这里查找的注释应该是一个范围，对象中可能有多个注释，所以要用二分查找两次，分别找到起始和终点，再截取数组
  // 左开区间,不满足条件的index
  const startIndex = binaryFindLeftBorder(0, comments.length - 1, (index) => {
    const commentNode = comments[index];
    return commentNode.range[0] < node.range[0];
  });
  if (startIndex >= comments.length - 1) return [];
  // 右闭区间
  const endIndex = binaryFindLeftBorder(
    startIndex + 1,
    comments.length - 1,
    (index) => {
      const commentNode = comments[index];
      return commentNode.range[1] < node.range[1];
    }
  );
  if (endIndex <= startIndex) return [];
  const commentsArr = comments.slice(startIndex + 1, endIndex + 1);
  return commentsArr;
};

export class I18nContextParser {
  private _ctx: GetRuleListenerContext;
  constructor(ctx?: GetRuleListenerContext) {
    if (ctx) {
      this.setContext(ctx);
    }
  }
  setContext(ctx: GetRuleListenerContext) {
    this._ctx = ctx;
  }
  get i18nCalleeName() {
    return getLastItem(this._ctx.i18nCalleeNameStack);
  }
  get lastCallExpression() {
    return getLastItem(this._ctx.upperCallExpressionStack);
  }
  get isInI18nCallExpression() {
    const { sourceCode, strictMode } = this._ctx;
    const lastCalleeName = getCallExpressionName(
      this.lastCallExpression,
      sourceCode
    );
    const isI18nCalleeName = strictMode
      ? lastCalleeName === this.i18nCalleeName
      : this._ctx.i18nCalleeNameStack.includes(lastCalleeName);
    return (
      this.lastCallExpression &&
      this.lastCallExpression.callee &&
      isI18nCalleeName
    );
  }
  get isInValidI18nCallExpression() {
    return (
      this.isInI18nCallExpression &&
      this.lastCallExpression &&
      this.lastCallExpression.arguments &&
      this.lastCallExpression.arguments.length
    );
  }
  get i18nConfigObjNode() {
    if (!this.isInValidI18nCallExpression) return null;
    const objArgNode = this.lastCallExpression.arguments[1];
    if (!objArgNode || objArgNode.type !== AST_NODE_TYPES.ObjectExpression) {
      return null;
    }
    return objArgNode;
  }
  findDefaultMessagePropertyIndex() {
    const i18nConfigObjNode = this.i18nConfigObjNode;
    if (!i18nConfigObjNode) return null;
    const { defaultMessageKey } = this._ctx;
    // 先从对象里找defaultMessage，如果找不到就在注释里找关键词
    const defMsgPropertyIndex = (i18nConfigObjNode.properties || []).findIndex(
      (item) => {
        if (item.type !== AST_NODE_TYPES.Property) return false;
        const keyNode = item.key;
        if (keyNode.type === AST_NODE_TYPES.Literal)
          return keyNode.value === defaultMessageKey;
        if (keyNode.type === AST_NODE_TYPES.Identifier)
          return keyNode.name === defaultMessageKey;
        return false;
      }
    );
    return defMsgPropertyIndex;
  }

  findPropertyRoundRange(range: TSESTree.Range) {
    const i18nConfigObjNode = this.i18nConfigObjNode;
    if (!i18nConfigObjNode) return [null, null];
    // 先从对象里找defaultMessage，如果找不到就在注释里找关键词
    const properties = this.i18nConfigObjNode?.properties ?? [];
    const leftIdx = binaryFindLeftBorder(0, properties.length - 1, (index) => {
      return properties[index]?.range[1] <= range[0];
    });
    const rightNode =
      properties[leftIdx + 1]?.range[0] >= range[1]
        ? properties[leftIdx + 1]
        : null;
    return [properties[leftIdx] || null, rightNode];
  }

  findPropertyRoundDefaultMessage() {
    const index = this.findDefaultMessagePropertyIndex();
    const properties = this.i18nConfigObjNode?.properties ?? [];
    const prevProperty = properties[index - 1] || null;
    const nextProperty = properties[index + 1] || null;
    return [prevProperty, nextProperty];
  }

  findDefaultMessageProperty() {
    const index = this.findDefaultMessagePropertyIndex();
    const i18nConfigObjNode = this.i18nConfigObjNode;
    return ((i18nConfigObjNode?.properties ?? [])[index] ||
      null) as TSESTree.Property | null;
  }

  getDefaultMessage() {
    const { defaultMessageKey, program } = this._ctx;
    const i18nConfigObjNode = this.i18nConfigObjNode;
    const defMsgProperty = this.findDefaultMessageProperty();
    if (defMsgProperty) {
      return {
        defaultMessage: defMsgProperty.value,
      };
    }

    const jsxComments = findCommentsInNode(
      program?.comments,
      i18nConfigObjNode
    );

    const templateComments = findCommentsInNode(
      (program as any)?.templateBody?.comments,
      i18nConfigObjNode
    );

    let matchItem: TSESTree.Comment;
    const reg = new RegExp(`${defaultMessageKey}:\\s*(['\`"])(.*)\\1`);

    if (isContain((program as any)?.templateBody, i18nConfigObjNode)) {
      matchItem = templateComments.find((item) => reg.test(item.value));
    } else {
      matchItem = jsxComments.find((item) => reg.test(item.value));
    }

    if (matchItem) {
      const defMsgStr = (matchItem.value || "").match(reg)[2];
      return {
        defaultMessage: createStringLiteral(defMsgStr),
        commentNode: matchItem,
      };
    }
    return {
      defaultMessage: null,
      commentNode: null,
    };
  }

  checkIsI18nKey(node: TSESTree.Node) {
    if (!this.isInValidI18nCallExpression) return false;
    const firstArgument = this.lastCallExpression.arguments[0];
    return isContain(firstArgument, node);
  }
  checkIsInDefaultMessageProperty(node: TSESTree.Node) {
    const { defaultMessage: defMessage } = this.getDefaultMessage();
    if (!defMessage) return false;
    return isContain(defMessage, node);
  }
}

export const i18nContextParser = new I18nContextParser();
