export class CollectCache {
  private _collectStatus: boolean = false;
  private _cache: Record<string, Record<string, string>> = {};
  add(key: string, value: string) {
    if (!(key in this._cache)) {
      this._cache[key] = {};
    }
    this._cache[key][value] = value;
  }
  reset() {
    this._cache = {};
    this._collectStatus = false;
  }
  openCollect() {
    this._collectStatus = true;
  }
  getCollectStatus() {
    return this._collectStatus;
  }
  getCache() {
    return this._cache;
  }
}

export const collectCache = new CollectCache();
