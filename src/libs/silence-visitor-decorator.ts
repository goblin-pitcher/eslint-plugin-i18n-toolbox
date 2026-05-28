import { TSESLint } from "@typescript-eslint/utils";

export const silenceVisitorDecorator = <T extends TSESLint.RuleListener>(
  visitor: T,
  silence?: boolean,
  silenceLog?: boolean
): T => {
  if (!silence) {
    return visitor;
  }
  return Object.keys(visitor).reduce((obj, key: keyof T) => {
    const handler: any = visitor[key];
    obj[key] = ((...args: any[]) => {
      try {
        handler(...args);
      } catch (e) {
        if (silenceLog) {
          console.log("~~~~", e);
        }
      }
    }) as any;
    return obj;
  }, {} as T);
};
