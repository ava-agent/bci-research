import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_AGENT_API_URL: process.env.NEXT_PUBLIC_AGENT_API_URL,
  },
  // 生产环境移除 console.log
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
