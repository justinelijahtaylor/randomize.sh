import type { NextConfig } from "next";
import path from "path";

const webRoot = process.cwd();
const shim = (name: string) => path.resolve(webRoot, "shims", `${name}.ts`);

const aliasMap: Record<string, string> = {
  fs: shim("fs"),
  "node:fs": shim("fs"),
  path: shim("path"),
  "node:path": shim("path"),
  url: shim("url"),
  "node:url": shim("url"),
  os: shim("os"),
  "node:os": shim("os"),
  crypto: shim("crypto"),
  "node:crypto": shim("crypto"),
};

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: webRoot,
  webpack: (config, { isServer }) => {
    // Only shim Node built-ins for the client bundle. The server bundle
    // (used at build time to prerender pages) keeps real Node modules.
    if (!isServer) {
      config.resolve.alias = { ...config.resolve.alias, ...aliasMap };
    }
    return config;
  },
  images: { unoptimized: true },
};

export default nextConfig;
