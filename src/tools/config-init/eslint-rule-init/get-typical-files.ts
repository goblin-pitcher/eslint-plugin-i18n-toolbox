import { extname } from "path";
import { dirTraverse } from "../../../libs";

export const getTypicalFiles = async (
  extensions: string[] = [".js", ".jsx", ".ts", ".tsx", ".vue", ".json", ""]
) => {
  const dir = process.cwd();
  const arr: string[] = [];
  const extendsSet = new Set();
  const validExtendsSet = new Set(extensions);
  await dirTraverse(dir, (filePath) => {
    const ext = extname(filePath);
    if (!extendsSet.has(ext) && validExtendsSet.has(ext)) {
      extendsSet.add(ext);
      arr.push(filePath);
    }
  });
  return arr;
};
