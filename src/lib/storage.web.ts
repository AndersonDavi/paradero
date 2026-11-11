/**
 * In the browser the same settings live in localStorage. SQLite on the web needs SharedArrayBuffer, which
 * browsers only give to cross-origin isolated pages, and without it the first read stops the whole app.
 * The page is also drawn once on the server, where there is no localStorage: reads find nothing there.
 */
const Storage = {
  getItemSync(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItemSync(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private windows and full storage refuse writes; the setting then lasts until the page closes.
    }
  },
};

export default Storage;
