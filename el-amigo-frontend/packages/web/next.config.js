/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,       // evita dobles renders en dev
  swcMinify: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};

module.exports = nextConfig;
