/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    CUSTOM_KEY: 'expense-management-app',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
};

module.exports = nextConfig;