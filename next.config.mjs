/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};
export default nextConfig;
