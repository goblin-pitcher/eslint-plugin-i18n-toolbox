import { TSESTree } from "@typescript-eslint/utils";
import { getRuleConfig } from "../libs";
import { collectCache } from "../tools/collect";
import { ASTNode, RuleContext } from "../types";

/**
 * 事件不多, 不需要利用二进制区分事件
 * 后续事件多了可以设fix: 1, inject: 2, fixAndInject: 1&2，利用位运算区分事件
 */
export enum ReportEventName {
  Fix = "fix", // 初级修复，不注入key
  FixAndInject = "fixAndInject", // 修复并注入key
  Collect = "collect", // 仅📱
}

export interface RuleReportEvent {
  node: ASTNode;
  prefix?: string;
  suffix?: string;
  trim?: boolean;
  quote?: string;
  i18nCalleeName?: string;
  isDefaultMessage?: boolean;
  isI18nKey?: boolean;
}

export interface ReportEvent extends RuleReportEvent {
  eventName: ReportEventName;
}

export const getReportEventInfo = (eventName: ReportEventName) => {
  const result = {
    isCollect: eventName === ReportEventName.Collect,
    isFix: [ReportEventName.Fix, ReportEventName.FixAndInject].includes(
      eventName
    ),
    isInject: eventName === ReportEventName.FixAndInject,
  };
  return result;
};
export const getEventName = (context: RuleContext) => {
  const config = getRuleConfig(context);
  const isCollect = collectCache.getCollectStatus();
  if (isCollect) return ReportEventName.Collect;
  return config.autoFillKey
    ? ReportEventName.FixAndInject
    : ReportEventName.Fix;
};
