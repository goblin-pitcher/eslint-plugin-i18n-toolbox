import { AST_TOKEN_TYPES, TSESLint } from "@typescript-eslint/utils";

export const getScriptInfo = (
  context: TSESLint.RuleContext<string, unknown[]>
) => {
  const filename =
    context.filename || (context.getFilename && context.getFilename()) || "";
  const isVueFile = filename.endsWith(".vue");
  if (!isVueFile)
    return {
      isVueFile,
      hasScript: false,
      isSetupScript: false,
    };
  const { sourceCode } = context;
  const firstToken = sourceCode.tokensAndComments[0];
  if (
    !firstToken ||
    firstToken.type !== AST_TOKEN_TYPES.Punctuator ||
    firstToken.value !== ("<script>" as string)
  ) {
    return {
      isVueFile,
      hasScript: false,
      isSetupScript: false,
    };
  }
  const {
    start: { line: startLine },
    end: { line: endLine },
  } = firstToken.loc || { start: { line: 0 }, end: { line: 0 } };
  if (startLine > 0 && endLine > 0) {
    const scriptText = sourceCode.lines.slice(startLine - 1, endLine).join(" ");
    return {
      isVueFile,
      hasScript: true,
      isSetupScript: /<script[\s\S]+?setup[\s\S]*?>/.test(scriptText),
    };
  }
  return {
    isVueFile,
    hasScript: true,
    isSetupScript: false,
  };
};

export const isVueSetupScript = (
  context: TSESLint.RuleContext<string, unknown[]>
) => {
  const { isSetupScript } = getScriptInfo(context);
  return isSetupScript;
};
