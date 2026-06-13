/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@whatsnext/shared'],
  // Avoid corrupted .pack.gz / missing chunk errors on Windows dev (HMR + partial cache deletes)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};
module.exports = nextConfig;
