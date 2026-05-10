/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nexora/contracts', '@nexora/config'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};

export default nextConfig;
