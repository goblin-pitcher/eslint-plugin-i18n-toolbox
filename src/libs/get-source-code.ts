import { TSESLint } from "@typescript-eslint/utils";

// 兼容不同版本的sourceCode,这里采用最保险的改法，因此不把兼容后的sourceCode挂载在context上
export const getSourceCode = (
  context: Readonly<TSESLint.RuleContext<string, unknown[]>>
) => {
  const oriSourceCode = context.sourceCode || context.getSourceCode();
  const getScope = (...args: Parameters<typeof oriSourceCode.getScope>) => {
    if (oriSourceCode.getScope) {
      return oriSourceCode.getScope(...args);
    }
    return context.getScope();
  };
  const sourceCode = Object.create(oriSourceCode);
  sourceCode.getScope = getScope;
  return sourceCode;
};
