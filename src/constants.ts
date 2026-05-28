import { RuleConfig } from "./types";

export const defSource: Required<
  Pick<Required<RuleConfig>["source"], "component" | "default">
> = {
  component: [
    {
      type: "import",
      specifier: "object", // object/default/namespace
      name: "@/locale/hooks",
    },
    {
      type: "hook",
      specifier: "object", // object/default/namespace
      name: "useLocale",
    },
    {
      type: "locale",
      name: "$t",
    },
  ],
  default: [
    {
      type: "import",
      specifier: "object", // object/default/namespace
      name: "@/locale/utils",
    },
    {
      type: "locale",
      name: "$t",
    },
  ],
};

export const defaultOption = {
  ignoreConsole: true,
  autoFillKey: true,
  defaultMessage: "defaultMessage",
  source: defSource,
  silence: false,
  commentDefaultMessage: false,
  revertCommentDefaultMessage: false,
  strictMode: false,
};
