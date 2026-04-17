/**
 * Browser shim for Node's `url` module.
 * Only `fileURLToPath` is used by ts-src.
 */

export function fileURLToPath(url: string | URL): string {
  const s = typeof url === "string" ? url : url.toString();
  return s.replace(/^file:\/\//, "");
}

export function pathToFileURL(p: string): URL {
  return new URL("file://" + p);
}

const defaultExport = { fileURLToPath, pathToFileURL };
export default defaultExport;
