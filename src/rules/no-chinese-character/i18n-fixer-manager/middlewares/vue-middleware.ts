import { AST } from "vue-eslint-parser";
import { Executor } from "../../../../events";
import { getReportEventInfo } from "../../../../events";
import { ignoreValidate } from "../../../../listeners/get-console-log-sign";
import { messageIds } from "../../constants";

export const vIdentifierMiddleware: Executor = ({ ctx, reportEvent }) => {
  if (ignoreValidate(ctx)) return;
  const { node, eventName, trim, i18nCalleeName, isDefaultMessage } =
    reportEvent;
  const { isFix } = getReportEventInfo(eventName);
  if (!isFix) return;

  if (node.type !== "VIdentifier") return;
  const val =
    (node as AST.VIdentifier).rawName || (node as AST.VIdentifier).name;
  if (typeof val !== "string") return;

  if (!i18nCalleeName || isDefaultMessage) return;
  const { context, filePath } = ctx;

  context.report({
    node: node as any,
    messageId: messageIds.vuePropertyNameFormat,
    fix(fixer) {
      return fixer.replaceText(node as any, `:${val}`);
    },
  });
};
