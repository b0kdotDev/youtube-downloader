import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["youtubei.js", "ffmpeg-static"],
};

export default nextConfig;
