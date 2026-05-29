import { TSESLint } from "@typescript-eslint/utils";
import { RuleContext } from "../types";
import { getSourceCode } from "./get-source-code";

export const vueCompatiableDecorator = (
  context: RuleContext,
  vueVisoitor: TSESLint.RuleListener,
  scriptVisitor: TSESLint.RuleListener = {}
) => {
  const sourceCode = getSourceCode(context);
  // 如果是vue项目，必然会使用eslint-plugin-vue，判定有相关parser就优先用这些parser包裹rules
  if (
    sourceCode.parserServices &&
    typeof sourceCode.parserServices.defineTemplateBodyVisitor === "function"
  ) {
    return sourceCode.parserServices.defineTemplateBodyVisitor(
      vueVisoitor,
      scriptVisitor
    );
  }
  if (
    context.parserServices &&
    typeof (context.parserServices as any).defineTemplateBodyVisitor ===
      "function"
  ) {
    return (context.parserServices as any).defineTemplateBodyVisitor(
      vueVisoitor,
      scriptVisitor
    );
  }
  return {
    ...vueVisoitor,
    ...scriptVisitor,
  };
};
