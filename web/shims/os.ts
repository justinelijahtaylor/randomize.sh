/**
 * Browser shim for Node's `os` module.
 */

export const EOL = "\n";

export function homedir(): string {
  return "/";
}

export function tmpdir(): string {
  return "/tmp";
}

export function platform(): string {
  return "browser";
}

export function arch(): string {
  return "wasm";
}

export function release(): string {
  return "0.0.0";
}

const defaultExport = { EOL, homedir, tmpdir, platform, arch, release };
export default defaultExport;
