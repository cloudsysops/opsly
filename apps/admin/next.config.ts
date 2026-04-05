import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo root (avoids picking ~/package-lock.json when tracing)
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
