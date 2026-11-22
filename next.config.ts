import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "node:path";

// Demo build (NEXT_PUBLIC_DEMO_MODE=true): swap the Firebase client SDK modules for in-memory
// shims so the app runs with no backend. Unset for real builds, which are unaffected.
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const demoShims: Record<string, string> = {
  "firebase/firestore": "lib/demo/firestoreShim.js",
  "firebase/auth": "lib/demo/authShim.js",
  "firebase/storage": "lib/demo/storageShim.js",
};

const nextConfig: NextConfig = {
  ...(isDemo && {
    // Turbopack (default bundler in Next 16): paths are relative to the project root
    turbopack: {
      resolveAlias: Object.fromEntries(
        Object.entries(demoShims).map(([mod, file]) => [mod, "./" + file])
      ),
    },
    // Webpack (next build --webpack / next dev --webpack)
    webpack(config: { resolve: { alias?: Record<string, string> } }) {
      config.resolve.alias = {
        ...config.resolve.alias,
        ...Object.fromEntries(
          Object.entries(demoShims).map(([mod, file]) => [mod + "$", path.resolve(process.cwd(), file)])
        ),
      };
      return config;
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

// Sentry is optional: only wrap (and upload source maps) when org and project are configured.
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

export default sentryOrg && sentryProject
  ? withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options
      org: sentryOrg,
      project: sentryProject,
      silent: !process.env.CI,
      widenClientFileUpload: true,
    })
  : nextConfig;
