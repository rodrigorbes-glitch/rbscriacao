/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
