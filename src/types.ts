import { AST_NODE_TYPES, TSESLint, TSESTree } from "@typescript-eslint/utils";
import { AST } from "vue-eslint-parser";
import { CommonFunctionNode } from "./libs/function-node-handler";

export type RuleContext = Readonly<TSESLint.RuleContext<string, RuleConfig[]>>;

export enum EventName {
  insert = "insert",
}

export interface EventDataMap {
  [EventName.insert]: {
    position?: "start" | "end";
    code: string;
  };
}

export type SourceDescItemType = "import" | "hook" | "locale";

export interface SourceDescItem {
  type: SourceDescItemType;
  name: string;
  specifier?: "object" | "default" | "namespace";
}
export interface RuleConfig {
  ignoreConsole?: boolean;
  silence?: boolean | string;
  autoFillKey?: boolean;
  defaultMessage?: string;
  commentDefaultMessage?: boolean;
  revertCommentDefaultMessage?: boolean;
  strictMode?: boolean;
  source?: {
    template?: SourceDescItem[];
    hooks?: SourceDescItem[];
    component?: SourceDescItem[];
    vueComponent?: SourceDescItem[];
    default?: SourceDescItem[];
  };
  templateLiteralExpression?: {
    prefix: string;
    suffix: string;
  };
}

export type GetRuleListenerContext = {
  config: RuleConfig;
  context: RuleContext;
  sourceCode: TSESLint.SourceCode;
  upperCallExpressionStack: TSESTree.CallExpression[];
  i18nCalleeNameStack: string[];
  filePath: string;
  defaultMessageKey: string;
  templateLiteralExpression: {
    prefix: string;
    suffix: string;
  };
  program?: TSESTree.Program;
  setup?: CommonFunctionNode;
  inVueTemplate?: boolean;
  forceQuote?: '"' | "'" | "`";
  inConsole?: boolean;
  strictMode?: boolean;
};

export type GetRuleListener = (
  context: GetRuleListenerContext
) => TSESLint.RuleListener;

type VNodeType = AST.VNode["type"];

export type VueListenerRule = Partial<
  Record<VNodeType, (node: AST.VNode) => void>
>;

export type ASTNode = TSESTree.Node | AST.VNode;
export type ASTNodeTypes = AST_NODE_TYPES | VNodeType;

export interface ESLintRuleOptions {}
