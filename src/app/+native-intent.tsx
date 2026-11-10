const DETAIL = /^\/?(stop|route)\/[^/?#]+/;

/** A link to a stop or a route from outside the app opens in the first tab, where a rider would have found it. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const at = path.replace(/^[a-z]+:\/\//i, "/").replace(/^\/+/, "/");
  return DETAIL.test(at) ? `/(tabs)/(home)${at}` : path;
}
