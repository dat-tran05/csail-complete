import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: join(process.cwd(), ".."),
  },
};

export default nextConfig;
