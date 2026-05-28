import crypto from "crypto";
import { traverseObj } from "../../libs";
import { FileData } from "../types";

const getHashKey = (content: string, len: number) => {
  const hash = crypto.createHash("md5").update(content).digest("hex");
  return hash.substring(0, len);
};

export const transHashKey = async (data: FileData, len: number = 6) => {
  traverseObj(data, ({ parent, path, isLeaf }) => {
    if (isLeaf) {
      const key = path[path.length - 1];
      const localeContent = parent[key];
      const newKey = getHashKey(localeContent, len);
      parent[newKey] = localeContent;
      if (key !== newKey) {
        delete parent[key];
      }
    }
  });
  return data;
};
