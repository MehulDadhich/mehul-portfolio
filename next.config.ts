import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server's live reload work when the site is opened from another
  // device on the local network (e.g. a phone at http://192.168.29.36:3000).
  allowedDevOrigins: ["192.168.29.36"],
};

export default nextConfig;
