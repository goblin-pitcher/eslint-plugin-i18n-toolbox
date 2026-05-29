import { requireJSON, setData, traverseObj } from "../../libs";
import { getConfig } from "../get-config";

type DataHandler = (data: Record<string, any>) => unknown;

class LocaleCache<T> {
  private _cache: T;
  private _cacheTime: number = 0;
  private _cacheTimeOut: number = 3000;
  private _filePath: string;
  private _handler: DataHandler;
  constructor({
    filePath,
    pollingTime,
    handler,
  }: {
    filePath: string;
    pollingTime: number;
    handler?: DataHandler;
  }) {
    this._filePath = filePath;
    this._cacheTimeOut = pollingTime;
    this._handler = handler;
  }
  getCache() {
    const now = +new Date();
    if (this._cache && this._cacheTime + this._cacheTimeOut - now > 0) {
      return this._cache;
    }
    this._cacheTime = now;
    const localeFileData = requireJSON(this._filePath, true) as Record<
      string,
      Record<string, string>
    >;
    let cacheData = localeFileData as any;
    if (typeof this._handler === "function") {
      cacheData = this._handler(localeFileData);
    }
    this._cache = cacheData;
    return this._cache;
  }
}

const genLocaleKeyMapper = () => {
  const config = getConfig();
  const { output, poll } = config.locale;
  const localeCache = new LocaleCache<Record<string, Record<string, string>>>({
    filePath: output,
    pollingTime: poll,
    handler: (localeFileData) => {
      const cacheData = {};
      traverseObj(localeFileData, ({ parent, path }) => {
        const key = path[path.length - 1];
        const prePath = path.slice(0, path.length - 1);
        const val = parent[key];
        if (typeof val === "string") {
          setData(cacheData, [...prePath, val], [...prePath, key].join("."));
        } else {
          setData(cacheData, path, { ...val });
        }
      });
      return cacheData;
    },
  });
  return localeCache;
};

export const localeKeyMapper = genLocaleKeyMapper();

const genLocaleData = () => {
  const config = getConfig();
  const { output, poll } = config.locale;
  const localeCache = new LocaleCache<Record<string, Record<string, string>>>({
    filePath: output,
    pollingTime: poll,
  });
  return localeCache;
};

export const localeData = genLocaleData();
