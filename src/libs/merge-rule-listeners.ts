import { TSESLint } from "@typescript-eslint/utils";

const formatRuleListener = (rule: TSESLint.RuleListener) => {
  const formatKey = (name: string) => {
    const [nodeName, lifecycle] = name.split(":");
    if (lifecycle === "exit") {
      return name;
    }
    return nodeName;
  };
  return Object.keys(rule).reduce((obj, key) => {
    obj[formatKey(key)] = obj[key];
    return obj;
  }, {} as TSESLint.RuleListener);
};

export const mergeRuleListeners = (
  ...args: TSESLint.RuleListener[]
): TSESLint.RuleListener => {
  const listener: TSESLint.RuleListener = {};
  const allRuleKeySet = args.reduce((st, rule) => {
    const formatRule = formatRuleListener(rule);
    Object.keys(formatRule).forEach((key) =>
      st.add(key as keyof TSESLint.RuleListener)
    );
    return st;
  }, new Set<keyof TSESLint.RuleListener>());

  allRuleKeySet.forEach((key) => {
    listener[key] = (node) => {
      args.forEach((rule) => {
        if (typeof rule[key] === "function") {
          rule[key](node);
        }
      });
    };
  });
  return listener;
};
