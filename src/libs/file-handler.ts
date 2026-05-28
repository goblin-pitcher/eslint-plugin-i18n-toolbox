import { existsSync, mkdir, readdir, stat, writeFile, unlink, rm } from "fs";
import { dirname, isAbsolute, join, relative } from "path";
import { promisify } from "util";

const promiseReaddir = promisify(readdir);
const promiseStat = promisify(stat);
const promiseUnlink = promisify(unlink);
const promiseRm = promisify(rm);

export const dirTraverse = async (
  dir: string,
  visit: (filePath: string) => void
) => {
  const files = await promiseReaddir(dir);
  const results: string[] = [];
  for (const file of files) {
    if (file === "node_modules") {
      continue;
    }
    const fullPath = join(dir, file);

    const fileInfo = await promiseStat(fullPath);
    if (fileInfo.isDirectory()) {
      results.push(...(await dirTraverse(fullPath, visit)));
    } else {
      visit(fullPath);
    }
  }
  return results;
};

export const isSubPath = (parent: string, child: string) => {
  const relativeRes = relative(parent, child);
  return (
    relativeRes && !relativeRes.startsWith("..") && !isAbsolute(relativeRes)
  );
};

export const promiseWriteFile = promisify(writeFile);
export const writeFileWithDir: typeof promiseWriteFile = async (
  filePath: string,
  ...extra
) => {
  // 获取文件夹路径
  const dir = dirname(filePath);

  const promiseMkdir = promisify(mkdir);

  // 确保文件夹存在
  await promiseMkdir(dir, { recursive: true });
  return promiseWriteFile(filePath, ...extra);
};

export const requireJSON = (path: string, noCache?: boolean) => {
  try {
    if (!existsSync(path)) return {};
    if (noCache) {
      delete require.cache[require.resolve(path)];
    }
    return require(path) || {};
  } catch (err) {
    return {};
  }
};

export const removeIfExists = async (targetPath: string) => {
  try {
    const stats = await promiseStat(targetPath);
    if (stats.isFile()) {
      await promiseUnlink(targetPath);
    } else if (stats.isDirectory()) {
      await promiseRm(targetPath, { recursive: true, force: true });
    }
    return true; // 文件或目录成功删除
  } catch (error) {
    return false; // 路径不存在，无需删除
  }
};
