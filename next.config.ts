import type { NextConfig } from "next";
import packageJson from "./package.json";

const appVersion = packageJson.version.startsWith("v")
  ? packageJson.version
  : `v${packageJson.version}`;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["adm-zip", "@prisma/client", "bcryptjs"],
  images: {
    unoptimized: true, // Ideal para self-hosted com thumbnails dinâmicas locais
  },
  env: {
    APP_VERSION: appVersion,
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
