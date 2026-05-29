import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { defSource } from "../constants";
import { RuleContext, SourceDescItem, SourceDescItemType } from "../types";
import { getRuleConfig } from "./common";

export interface SourceDescItemWithText extends SourceDescItem {
  text?: string;
  key?: string;
}

export const getSourceDescObj = (content: RuleContext) => {
  const ruleConfig = getRuleConfig(content);
  const desc = ruleConfig.source || {};
  let fullDesc = { ...desc };
  if (!Object.keys(fullDesc).length) {
    fullDesc = defSource;
  }
  if (!fullDesc.default) {
    fullDesc.default = defSource.default;
  }
  if (!fullDesc.component) {
    fullDesc.component = fullDesc.default;
  }
  if (!fullDesc.hooks) {
    fullDesc.hooks = fullDesc.component;
  }
  if (!fullDesc.template) {
    fullDesc.template = fullDesc.component;
  }
  if (!fullDesc.vueComponent) {
    fullDesc.vueComponent = fullDesc.component;
  }
  return fullDesc;
};

export const sourceDescParser = (sourceDesc: SourceDescItem[]) => {
  const indexObj: Partial<Record<SourceDescItemType, number>> = {};
  const sourceDescMap = sourceDesc.reduce((obj, item, curIndex) => {
    if (!(item.type in obj)) {
      indexObj[item.type] = curIndex;
    }
    obj[item.type] = {
      ...item,
    };
    return obj;
  }, {} as Partial<Record<SourceDescItemType, SourceDescItemWithText>>);
  const triggerConfirError = () => {
    throw new Error("source规则配置错误");
  };
  const getKey = (curIdx: number) => {
    return sourceDesc[curIdx + 1] ? sourceDesc[curIdx + 1].name : "";
  };
  if (sourceDescMap.import) {
    const key = getKey(indexObj.import);
    if (!key) {
      triggerConfirError();
    }
    const { specifier, name } = sourceDescMap.import;
    let importContent = `{ ${key} }`;
    if (specifier === "namespace") {
      importContent = `* as ${key}`;
    } else if (specifier === "default") {
      importContent = key;
    }
    sourceDescMap.import.text = `import ${importContent} from "${name}"\n`;
    sourceDescMap.import.key = key;
  }

  if (sourceDescMap.hook) {
    const key = getKey(indexObj.hook);
    if (!key) {
      triggerConfirError();
    }
    const { specifier, name } = sourceDescMap.hook;
    let importContent = `{ ${key} }`;
    if (specifier === "default") {
      importContent = key;
    }
    sourceDescMap.hook.text = `const ${importContent} = ${name}();\n`;
    sourceDescMap.hook.key = key;
  }
  return sourceDescMap;
};

export const getSourceDescMap = (content: RuleContext) => {
  const descObj = getSourceDescObj(content);
  const keys = Object.keys(descObj);
  return keys.reduce((obj, key: keyof typeof descObj) => {
    obj[key] = sourceDescParser(descObj[key]);
    return obj;
  }, {} as Record<keyof typeof descObj, ReturnType<typeof sourceDescParser>>);
};

export const filterValidImportDescItem = (
  nodes: TSESTree.Node[],
  items: SourceDescItemWithText[]
): SourceDescItemWithText[] => {
  const existedImportDeclarationObj = nodes.reduce((obj, item) => {
    if (!item || item.type !== AST_NODE_TYPES.ImportDeclaration) return obj;
    const source = item.source?.value;
    if (!source) return obj;
    const names = (item.specifiers || [])
      .map((it) => it?.local?.name)
      .filter(Boolean);

    const existedNames = obj[source] ? [...obj[source]] : [];
    obj[source] = new Set([...existedNames, ...names]);
    return obj;
  }, {} as Record<string, Set<string>>);

  const result = items.filter((item) => {
    if (item.type !== "import") return false;
    return !existedImportDeclarationObj[item.name]?.has(item.key);
  });
  return result;
};
