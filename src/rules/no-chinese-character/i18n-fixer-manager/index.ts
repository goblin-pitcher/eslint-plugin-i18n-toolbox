import { ReportEventHandler, Executor } from "../../../events";
import { GetRuleListenerContext } from "../../../types";
import {
  i18nKeyMiddleware,
  literalMiddleware,
  templateLiteralMiddleware,
  vIdentifierMiddleware,
} from "./middlewares";

const executor: Executor = (options) => {
  const allMiddlewares = [
    literalMiddleware,
    templateLiteralMiddleware,
    vIdentifierMiddleware,
    i18nKeyMiddleware, // 这个应该放到最后
  ];
  allMiddlewares.map((fn) => fn(options));
};

export class I18nFixerManager extends ReportEventHandler {
  constructor(ctx: GetRuleListenerContext) {
    super({
      ctx,
      executor,
    });
  }
}
