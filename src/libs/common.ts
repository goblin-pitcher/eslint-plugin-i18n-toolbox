import { relative, resolve } from "path";
import { defaultOption } from "../constants";
import { RuleConfig, RuleContext } from "../types";

export const isChinese = (str: unknown): str is string => {
  return (
    typeof str === "string" &&
    /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(str)
  );
};

export const createMessageIds = <K extends string>(
  messages: Record<K, string>
) => {
  return Object.keys(messages).reduce((obj, key: K) => {
    obj[key] = key;
    return obj;
  }, {} as Record<K, K>);
};

export const getLastItem = <T>(arr: T[]) => {
  return arr[arr.length - 1];
};

export const getFileName = (context: RuleContext, isRelative?: boolean) => {
  const fullPath =
    context.filename || (context.getFilename && context.getFilename()) || "";
  if (!isRelative) return fullPath;
  return relative(process.cwd(), fullPath);
};

export const getTrimStrInfo = (str: string) => {
  const trimStr = str.trim();
  if (trimStr === str) {
    return {
      prefix: "",
      suffix: "",
      content: trimStr,
    };
  }
  const prefixMatch = str.match(/^\s*/);
  const suffixMatch = str.match(/\s*$/);
  return {
    prefix: prefixMatch ? prefixMatch[0] : "",
    suffix: suffixMatch ? suffixMatch[0] : "",
    content: trimStr,
  };
};

export const isObject = (obj: unknown) => {
  return obj && typeof obj === "object";
};
export const isPureObject = (obj: unknown): obj is object => {
  return isObject(obj) && !Array.isArray(obj);
};

const baseObjMerge = (
  target: Record<string, any>,
  source: Record<string, any>
) => {
  const allKeys = (Object.getOwnPropertySymbols(source) as any[]).concat(
    Object.getOwnPropertyNames(source)
  );
  for (const i in allKeys) {
    const key = allKeys[i];
    if (Array.isArray(source[key])) {
      if (!Array.isArray(target[key])) {
        target[key] = [];
      }
      target[key] = Array.from(new Set([...target[key], ...source[key]]));
    } else if (isPureObject(source[key])) {
      if (!isPureObject(target[key])) {
        target[key] = {};
      }
      baseObjMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

export const merge = <A>(...args: A[]) => {
  const getDecoObj = <T>(value?: T) => ({ value });
  const mergeArr = args.map(getDecoObj);
  const resultObj = mergeArr.reduce(
    (obj, item) => baseObjMerge(obj, item),
    getDecoObj()
  );
  return resultObj.value as A;
};

export const cwdFileName = (fileNameStr: string) => {
  return resolve(process.cwd(), fileNameStr);
};

export const isDef = <T>(val: T): val is Exclude<T, undefined | null> =>
  val !== undefined && val !== null;

type DataHandler = (ctx: { parent: any; key: string }) => void;
export const getData = <T>(
  obj: T,
  path: string[],
  undefHandler?: DataHandler
) => {
  if (!path.length) return obj;
  return path.reduce((val, p) => {
    if (typeof undefHandler === "function" && !isDef((val as any)?.[p])) {
      undefHandler({ parent: val, key: p });
    }
    return (val as any)?.[p];
  }, obj);
};

export const setData = (
  obj: unknown,
  path: string[],
  value: unknown,
  opt?: {
    undefHandler?: DataHandler;
    assignHandler?: DataHandler;
  }
) => {
  if (!path.length) return false;
  const { undefHandler, assignHandler } = opt || {};
  const data = getData(obj, path.slice(0, path.length - 1), undefHandler);

  if (!isDef(data)) return false;
  if (typeof assignHandler === "function") {
    assignHandler({ parent: data, key: path[path.length - 1] });
  } else {
    data[path[path.length - 1]] = value;
  }
  return true;
};

export const deleteByPath = (obj: unknown, path: string[]) => {
  const data = getData(obj, path.slice(0, path.length - 1));
  if (!isDef(data)) return;
  delete data[path[path.length - 1]];
};

export const getRuleConfig = (context: RuleContext): RuleConfig => {
  return {
    ...defaultOption,
    ...((context.options[0] || {}) as RuleConfig),
  };
};

export const uniqueArr = <T>(arr: T[]) => [...new Set(arr)];

export const addDefToSet = <T>(st: Set<T>, val: T) => {
  if (isDef(val)) {
    st.add(val);
  }
};

export const traverseObj = (
  obj: Record<string, any>,
  visit: (ctx: { parent: any; path: string[]; isLeaf: boolean }) => void
) => {
  const path: string[] = [];
  const traverse = (data: Record<string, any>) => {
    if (!isObject(data)) return;
    const keys = Object.keys(data);
    keys.forEach((key) => {
      path.push(key);
      visit({
        parent: data,
        path,
        isLeaf: !isObject(data[key]),
      });
      traverse(data[key]);
      path.pop();
    });
  };
  traverse(obj);
};

/**
 * 利用二分查找的特效，找到刚好满足某条件的值
 * 调用起来则是：binaryFindBorder(100, val=>val<=72)
 * 返回值是左边界：72
 * 注意，只能计算左边界
 */

export const binaryFindLeftBorder = (
  left: number,
  right: number,
  isLeftPart: (val: number) => boolean
): number => {
  let l = left;
  let r = right;
  if (r < l) return r;
  if (isLeftPart(r)) return r;
  if (!isLeftPart(l)) return l - 1;
  while (l < r - 1) {
    const mid = ~~((l + r) / 2);
    if (isLeftPart(mid)) {
      l = mid;
    } else {
      r = mid;
    }
  }
  return l;
};
