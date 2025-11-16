/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  eslint: {
    // Allow build to continue with warnings
    ignoreDuringBuilds: false,
  },
  images: {
    // Allow base64 images
    remotePatterns: [],
    unoptimized: true, // For base64 images
  },
};

// Enable hot reload in Docker with file watching
if (process.env.NODE_ENV === 'development') {
  nextConfig.webpackDevMiddleware = (config) => {
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Delay before rebuilding
      ignored: ['**/node_modules', '**/.git', '**/.next'],
    };
    return config;
  };
  
  // Enable fast refresh
  nextConfig.fastRefresh = true;
}

module.exports = nextConfig;

