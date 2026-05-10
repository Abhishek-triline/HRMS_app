/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nexora/contracts', '@nexora/config'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  webpack: (config) => {
    // Allow Node-ESM-style `.js` imports inside our TS workspace packages
    // to resolve to the actual `.ts` source files.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
