import { join, parse, relative } from "path";
import {
  createFilePathValidate,
  deleteByPath,
  getData,
  getLastItem,
  isObject,
  isPureObject,
  merge,
  removeIfExists,
  requireJSON,
  setData,
  traverseObj,
  writeFileWithDir,
} from "../../libs";
import { getConfig } from "../get-config";
import {
  CollectFileData,
  FileData,
  SplitConfig,
  WriteLocaleFile,
} from "../types";
import { getFullOutput } from "../utils";
import { transHashKey } from "./hash-key";
import { getSubFilePath } from "./utils";

const writeToFileSymbol = Symbol("writeToFile");

interface WriteToFileDirTree {
  [writeToFileSymbol]?: boolean;
  [key: string]: WriteToFileDirTree;
}

const decoExportWrapper = (content: string) => {
  return `/* eslint-disable i18n-toolbox/no-chinese-character */
  module.exports = ${content}
  `;
};

type SplitGroupFn = SplitConfig["splitGroups"][number];

const splitGroupFnParser = (groupFn: SplitGroupFn, filePath: string) => {
  if (typeof groupFn !== "function") return null;
  const groupResult = groupFn(filePath);

  if (!groupResult) return null;
  if (typeof groupResult === "string") {
    return {
      path: groupResult.split("."),
      writeToFile: false,
    };
  }
  if (Array.isArray(groupResult)) {
    return {
      path: groupResult,
      writeToFile: false,
    };
  }
  if (isObject(groupResult)) {
    const { path, writeToFile = false } = groupResult;
    const pathArr = Array.isArray(path) ? path : path.split(".");
    return {
      path: pathArr,
      writeToFile,
    };
  }
  return null;
};

export const parseKeyPathInfo = (
  pathArr: string[],
  rootSplitConfig: SplitConfig | undefined,
  root: string,
) => {
  const dirTree: WriteToFileDirTree = {};
  const { splitGroups = [], splitKeyReplacer = "-" } = rootSplitConfig || {};
  const fileRelativePath = join(root, ...pathArr);
  for (let i = 0; i < splitGroups.length; i++) {
    const overrideResult = splitGroupFnParser(splitGroups[i], fileRelativePath);
    if (overrideResult) {
      const { path: overridePathArr, writeToFile } = overrideResult;
      setData(
        dirTree,
        overridePathArr,
        {
          [writeToFileSymbol]: writeToFile,
        },
        {
          undefHandler: ({ parent, key }) => {
            parent[key] = {};
          },
        },
      );

      return {
        path: overridePathArr,
        dirTree,
      };
    }
  }

  let curSplitConfig: SplitConfig | undefined = rootSplitConfig;
  let curDirTree = dirTree;
  const replaceKey = (key?: string) => {
    if (typeof splitKeyReplacer === "function") return splitKeyReplacer(key);
    if (!key || typeof splitKeyReplacer !== "string") return key;
    const result = key.replace(/\./g, splitKeyReplacer);
    return result;
  };
  const replacePathArr = pathArr.map(replaceKey);
  for (let i = 0; i < pathArr.length; i++) {
    const key = pathArr[i];
    const overrideKey = replacePathArr[i];
    const needSplit = !!curSplitConfig?.split;
    if (!needSplit) {
      return {
        path: replacePathArr.slice(0, i),
        dirTree,
      };
    }

    curDirTree[overrideKey] = {
      [writeToFileSymbol]:
        !!curSplitConfig?.splitWriteToFile ||
        (curSplitConfig as any)?.split?.[key]?.writeToFile,
    };

    curDirTree = curDirTree[overrideKey];
    curSplitConfig = (curSplitConfig as any)?.split?.[key];
  }
  return {
    path: replacePathArr,
    dirTree,
  };
};

const transCollectData = (data: CollectFileData) => {
  const config = getConfig();
  const { root, common, name, split, splitWriteToFile } = config.locale;
  const { keyName: commonKey, ignorePath } = common || {};
  let minTimes = common?.minTimes ?? Infinity;

  if (minTimes <= 1) {
    console.log("~~~minTimes不能小于1，该参数本次不生效~~~");
    minTimes = Infinity;
  }
  const result: FileData = {};

  if (commonKey) {
    result[commonKey] = {};
  }

  const rootSplitConfig = config.locale;

  const cacheKeyPath: Record<string, string[][]> = {};

  let fullDirTree: WriteToFileDirTree = {};
  const checkIgnore = createFilePathValidate(ignorePath, {
    root: process.cwd(),
  });
  // let testDir: WriteToFileDirTree = {};
  Object.keys(data).map((filePath) => {
    const keyPath = getSubFilePath(root, filePath);
    if (!keyPath.length) return;
    const { path, dirTree } = parseKeyPathInfo(
      keyPath,
      rootSplitConfig,
      rootSplitConfig.root,
    );
    fullDirTree = merge({}, fullDirTree, dirTree);
    const obj = data[filePath];
    if (path.length) {
      setData(result, path, obj, {
        undefHandler: ({ parent, key }) => {
          parent[key] = {};
        },
        assignHandler: ({ parent, key }) => {
          parent[key] = {
            ...parent[key],
            ...obj,
          };
        },
      });
    } else {
      Object.assign(result, obj);
    }
    if (!checkIgnore(filePath)) {
      Object.keys(obj).map((k) => {
        const val = obj[k];
        if (!(val in cacheKeyPath)) {
          cacheKeyPath[val] = [];
        }
        cacheKeyPath[val].push([...path, k]);
      });
    }
  });
  Object.keys(cacheKeyPath).map((val) => {
    const pathArr = cacheKeyPath[val];
    if (pathArr.length < minTimes) return;
    (result[commonKey] as FileData)[val] = val;
    pathArr.forEach((path) => {
      deleteByPath(result, path);
    });
  });

  return {
    data: result,
    dirTree: fullDirTree,
  };
};

export const writeFileToDirOrFile = async (
  obj: object,
  dirTree: WriteToFileDirTree,
) => {
  const config = getConfig();
  const { output, defaultOutputExt = "json" } = config.locale;
  const formatOutput = (outputPath: string) =>
    getFullOutput(outputPath, defaultOutputExt);
  await removeIfExists(output);
  if (!dirTree || !Object.keys(dirTree).length) {
    const content = JSON.stringify(obj, null, 2);
    const writeOutput = formatOutput(output);
    if (writeOutput.endsWith(".json")) {
      writeFileWithDir(writeOutput, content);
    } else {
      writeFileWithDir(writeOutput, decoExportWrapper(content));
    }
    console.log(`中文字段已写入 ${relative(process.cwd(), output)}`);
    return;
  }
  const writeFileData = async (
    data: Record<string | symbol, any>,
    curDirTree: WriteToFileDirTree,
    filePath: string,
  ) => {
    if (!isPureObject(data) || !curDirTree)
      return {
        content: JSON.stringify(data, null, 2),
      };
    const keys = Object.keys(data);
    const pairStrArr: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let pairStr = "";
      const fileDir = join(filePath, `${key}`);
      if (curDirTree[key] && curDirTree[key][writeToFileSymbol]) {
        const { writePath: fileWritePath = "" } = await writeFileData(
          data[key],
          curDirTree[key],
          fileDir,
        );
        pairStr = `"${key}": require("${fileWritePath || fileDir}")`;
      } else {
        const { content: curContent } = await writeFileData(
          data[key],
          curDirTree[key],
          fileDir,
        );
        pairStr = `"${key}": ${curContent}`;
      }
      pairStrArr.push(pairStr);
    }
    const mainContent = `{
    ${pairStrArr.join(",\n")}
    }`;
    let fileWritePath = "";
    if (curDirTree[writeToFileSymbol]) {
      let hasWriteToFile = false;
      const relativePathContent = mainContent.replace(
        /require\("(.+?)"\)/g,
        (str, $1) => {
          hasWriteToFile = true;
          const relativePath = relative(filePath, $1);
          return `require("./${relativePath}")`;
        },
      );
      const writePath = hasWriteToFile
        ? join(filePath, "index.js")
        : formatOutput(filePath);
      fileWritePath = writePath;
      await writeFileWithDir(
        writePath,
        writePath.endsWith(".json")
          ? relativePathContent
          : decoExportWrapper(relativePathContent),
      );
    }
    return {
      writePath: fileWritePath,
      content: mainContent,
    };
  };
  const writeDirTree = { ...dirTree, [writeToFileSymbol]: true };

  await writeFileData(obj, writeDirTree, output);
};

export const writeLocaleFile: WriteLocaleFile = async (data, oldData) => {
  const config = getConfig();
  const compareData = Object.keys(oldData).length
    ? oldData
    : requireJSON(config.locale.output);

  if (typeof config.locale.writeLocaleFile === "function") {
    return config.locale.writeLocaleFile(data, compareData);
  }
  const { output, hashKey: hashKeyVal, override } = config.locale;
  const hashKey =
    typeof hashKeyVal === "boolean" ? (hashKeyVal ? 8 : 0) : hashKeyVal;

  const { data: result, dirTree } = transCollectData(data);

  let finalResult = result;

  if (!override) {
    if (Object.keys(compareData).length > 0) {
      // 缓存原本路径上obj生成的value set，避免降低复杂度
      const existedStrMap: Map<string, Set<string>> = new Map();
      traverseObj(result, ({ parent, path, isLeaf }) => {
        if (isLeaf) {
          const comparePath = path.slice(0, path.length - 1);
          let compareSet: Set<string> = new Set();
          const findKey = comparePath.join(".");
          if (existedStrMap.has(findKey)) {
            compareSet = existedStrMap.get(findKey);
          } else {
            const compareVal = getData(compareData, comparePath);
            if (compareVal && isPureObject(compareVal)) {
              compareSet = new Set(
                Object.values(compareVal).filter(
                  (item) => typeof item === "string",
                ),
              );
            } else {
              compareSet = new Set();
            }
            existedStrMap.set(findKey, compareSet);
          }
          const key = getLastItem(path);
          if (compareSet.has(parent[key])) {
            delete parent[key];
          }
        }
      });
    }
    finalResult = merge(compareData, result);
  }

  if (!output) {
    console.log("请配置国际化文件路径");
    return;
  }

  if (hashKey) {
    transHashKey(finalResult, hashKey);
  }
  await writeFileToDirOrFile(finalResult, dirTree);
};
