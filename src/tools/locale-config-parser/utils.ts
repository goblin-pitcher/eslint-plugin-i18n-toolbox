import { parse, relative, sep } from "path";
import { isSubPath } from "../../libs";

export const getSubFilePath = (
  root: string,
  filePath: string,
  count: number = Infinity
) => {
  if (!isSubPath(root, filePath)) return [];
  const relativePathArr = relative(root, filePath).split(sep);
  return relativePathArr.slice(0, count).map((item, idx) => {
    if (idx === relativePathArr.length - 1) return parse(item).name;
    return item;
  });
};

export const getSubFirstDirOrFileName = (root: string, filePath: string) => {
  return getSubFilePath(root, filePath, 1)[0] || "";
};
