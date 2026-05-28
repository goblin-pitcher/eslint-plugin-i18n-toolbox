import { parse } from "path";

export const getFullOutput = (
  outputPath: string,
  defaultOutputExt: string = "json"
) => {
  const { ext } = parse(outputPath);
  return ext
    ? outputPath
    : `${outputPath}.${defaultOutputExt.replace(/^\./, "")}`; // 这里replace是为了避免用户配置的defaultOutputExt是.json格式
};
