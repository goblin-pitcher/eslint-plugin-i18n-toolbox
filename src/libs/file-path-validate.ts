import { join } from "path";
import { isSubPath } from "./file-handler";

export type ValidateFilePathTuple =
  | string
  | RegExp
  | ((filePath: string) => boolean);
export type ValidateFilePath = ValidateFilePathTuple | ValidateFilePathTuple[];
export type CreateFilePathValidate = (
  filePath?: ValidateFilePath,
  options?: {
    validateType?: "some" | "every";
    root?: string;
  }
) => (filePath: string) => boolean;

export const createFilePathValidate: CreateFilePathValidate = (
  filePathConfig,
  options
) => {
  const { validateType = "some", root = "" } = options || {};
  const handlers = ([] as ValidateFilePathTuple[])
    .concat(filePathConfig)
    .filter(Boolean) // 过滤空字符串、undefined之类的
    .map((item) => {
      if (typeof item === "string") {
        return (filePath: string) => isSubPath(join(root, item), filePath);
      }
      if (item instanceof RegExp) {
        return (filePath: string) => item.test(filePath);
      }
      if (typeof item === "function") return item;
      return null;
    })
    .filter(Boolean); // 过滤无效方法
  return (filePath: string) => {
    if (!filePath) return false;
    if (validateType === "some") {
      return handlers.some((handler) => handler(filePath));
    }
    return handlers.every((handler) => handler(filePath));
  };
};
