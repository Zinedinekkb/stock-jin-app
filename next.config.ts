import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
