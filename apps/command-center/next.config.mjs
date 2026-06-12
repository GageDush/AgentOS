import { existsSync, readFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";



const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");



function loadRootEnv() {

  const envPath = join(repoRoot, ".env");

  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {

    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");

    if (index <= 0) continue;

    const key = line.slice(0, index).trim();

    if (process.env[key]) continue;

    let value = line.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {

      value = value.slice(1, -1);

    }

    process.env[key] = value;

  }

}



loadRootEnv();



const localApiTarget = `http://127.0.0.1:${process.env.AGENTOS_API_PORT ?? 8787}`;

const apiProxyTarget =

  process.env.AGENTOS_API_PROXY_TARGET?.trim() ||

  (process.env.NODE_ENV !== "production" ? localApiTarget : null) ||

  process.env.AGENTOS_API_BASE_URL?.trim() ||

  process.env.NEXT_PUBLIC_AGENTOS_API_URL?.trim() ||

  localApiTarget;



const workspacePackages = ["@agentos/shared", "@agentos/ui", "@agentos/app-generator"];



/** @type {import('next').NextConfig} */

const nextConfig = {

  transpilePackages: workspacePackages,

  env: {

    NEXT_PUBLIC_AGENTOS_API_URL:

      process.env.NEXT_PUBLIC_AGENTOS_API_URL?.trim() ||

      process.env.AGENTOS_API_BASE_URL?.trim() ||

      "http://localhost:8787"

  },

  async rewrites() {

    return [

      {

        source: "/agentos-api/:path*",

        destination: `${apiProxyTarget.replace(/\/$/, "")}/:path*`

      }

    ];

  },

  webpack(config, { dev }) {

    if (!dev) return config;

    config.watchOptions = {

      ...config.watchOptions,

      ignored: ["**/node_modules/**", "!**/node_modules/@agentos/**"]

    };

    config.snapshot = {

      ...config.snapshot,

      managedPaths: [/^(.+?[\\/]node_modules[\\/])(?!@agentos)/]

    };

    return config;

  }

};



export default nextConfig;


