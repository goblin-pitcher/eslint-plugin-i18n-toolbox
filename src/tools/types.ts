import { ValidateFilePath } from "../libs";

export type MaybePromise<T> = T | Promise<T>;

export interface CollectFileData {
  [fileDir: string]: {
    [key: string]: string;
  };
}
export interface FileData {
  [fileDir: string]: FileData | string;
}

export type FilePathValidateConfig = (
  | string
  | RegExp
  | ((filePath: string) => boolean)
)[];
export type FilePathValidate = (
  filePathConfig: FilePathValidateConfig
) => boolean;

// 获取失败直接返回空字符串
export type GetLocaleKey = (filePath: string, word: string) => string;
export type GetLocaleValue = (data: CollectFileData, key: string) => string;
// 返回false或Promise<false>，代表写入失败
export type WriteLocaleFile = (
  data: CollectFileData,
  oldData?: CollectFileData
) => MaybePromise<boolean>;

export interface SplitConfig {
  writeToFile?: boolean;
  splitWriteToFile?: boolean;
  // todo...还没做
  name?: (path: string[]) => string;
  override?: boolean;
  split?:
    | {
        [key: string]: SplitConfig;
      }
    | boolean;
  splitGroups?: ((fileRelativePath: string) =>
    | string
    | undefined
    | void
    | string[]
    | {
        path: string | string[];
        writeToFile?: boolean;
      })[];
  splitKeyReplacer?: string | ((key: string) => string);
}
export interface I18nToolboxConfig {
  eslintrc?: string | string[];
  ignore?: string | string[];
  collect: {
    input: string | string[];
    customSuffix?: boolean;
    ignorePath?: FilePathValidateConfig;
  };
  init: {
    output?: string;
  };
  locale: Omit<SplitConfig, "writeToFile"> & {
    root: string;
    output: string;
    // 若内容不需要继续拆分，则采用默认拓展名，否则拆分目录，并生成对应的index.js文件
    defaultOutputExt?: "json" | "js";
    common?: {
      keyName?: string;
      minTimes?: number;
      ignorePath?: ValidateFilePath;
    };
    writeLocaleFile?: WriteLocaleFile;
    getLocaleKey?: GetLocaleKey;
    getLocaleValue?: GetLocaleValue;
    /**getFile时的最小时间间隔 */
    poll: number;
    hashKey?: number | boolean;
  };
}
