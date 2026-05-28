import { EventEmitter } from "events";
import { i18nContextParser } from "../libs";
import { ASTNode, GetRuleListenerContext } from "../types";
import { getEventName, ReportEvent, RuleReportEvent } from "./report-event";

export type ReportEventLifecycle = EventEmitter<{
  onLocale: [ASTNode];
}>;

export type Executor = (options: {
  ctx: GetRuleListenerContext;
  reportEvent: ReportEvent;
  lifecycle: ReportEventLifecycle;
}) => void | undefined;

export class ReportEventHandler {
  static overrideEventProperty = (
    ctx: GetRuleListenerContext,
    event: RuleReportEvent
  ) => {
    i18nContextParser.setContext(ctx);
    return {
      i18nCalleeName: event.i18nCalleeName || i18nContextParser.i18nCalleeName,
      isDefaultMessage: i18nContextParser.checkIsInDefaultMessageProperty(
        event.node as any
      ),
      isI18nKey: i18nContextParser.checkIsI18nKey(event.node as any),
    };
  };
  static trigger = (options: {
    ctx: GetRuleListenerContext;
    ruleReportEvents: RuleReportEvent[] | RuleReportEvent;
    executor: Executor;
    reportEventsProcessor?: (arr: ReportEvent[]) => ReportEvent[];
    lifecycle: ReportEventLifecycle;
  }) => {
    const {
      ctx,
      ruleReportEvents,
      executor,
      reportEventsProcessor,
      lifecycle,
    } = options;
    const { context } = ctx;
    const eventName = getEventName(context);

    const events = ([] as RuleReportEvent[]).concat(ruleReportEvents);
    let reportEvents = events.map<ReportEvent>((item) => ({
      ...item,
      eventName,
      ...ReportEventHandler.overrideEventProperty(ctx, item),
    }));
    if (reportEventsProcessor) {
      reportEvents = reportEventsProcessor(reportEvents);
    }

    reportEvents.map((reportEvent) =>
      executor({ ctx, reportEvent, lifecycle })
    );
  };
  private _eventArr: RuleReportEvent[] = [];
  private _ctx: GetRuleListenerContext;
  private _reportEventsProcessor: (arr: ReportEvent[]) => ReportEvent[];
  private _executor: Executor;
  private _baseEventParams: Partial<RuleReportEvent> = {};
  public lifecycle: ReportEventLifecycle = new EventEmitter();
  constructor(options: {
    ctx: GetRuleListenerContext;
    executor: Executor;
    reportEventsProcessor?: (arr: ReportEvent[]) => ReportEvent[];
  }) {
    const { ctx, executor, reportEventsProcessor } = options;
    this._ctx = ctx;
    this._executor = executor;
    this._reportEventsProcessor = reportEventsProcessor;
  }
  setBaseEventParams(params: Partial<RuleReportEvent>) {
    this._baseEventParams = params;
  }
  getBaseEventParams() {
    return this._baseEventParams;
  }
  addEvent(event: RuleReportEvent) {
    const handlerEvent: RuleReportEvent = {
      ...event,
      ...ReportEventHandler.overrideEventProperty(this._ctx, event),
    };
    this._eventArr.push(handlerEvent);
  }
  trigger(event: RuleReportEvent | RuleReportEvent[]) {
    ReportEventHandler.trigger({
      ctx: this._ctx,
      ruleReportEvents: {
        ...this._baseEventParams,
        ...event,
      },
      lifecycle: this.lifecycle,
      executor: this._executor,
      reportEventsProcessor: this._reportEventsProcessor,
    });
  }
  batch() {
    this.trigger(this._eventArr);
    this._eventArr = [];
  }
}
