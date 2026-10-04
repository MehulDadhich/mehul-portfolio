import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server's live reload work when the site is opened from another
  // device on the local network (e.g. a phone at http://192.168.29.36:3000).
  allowedDevOrigins: ["192.168.29.36"],
  // hide the Next.js dev-tools "N" badge; it sat on top of the Arc launcher (dev only, never in production)
  devIndicators: false,
};

export default nextConfig;
