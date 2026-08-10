import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev sunucusuna yerel ağdan (telefon vb.) erişime izin ver — Next 16
  // varsayılan olarak localhost dışı origin'lerin /_next isteklerini engelliyor
  allowedDevOrigins: ["10.1.12.250"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
