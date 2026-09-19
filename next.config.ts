import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["adm-zip", "@prisma/client", "bcryptjs"],
  images: {
    unoptimized: true, // Ideal para self-hosted com thumbnails dinâmicas locais
  },
};

export default nextConfig;
