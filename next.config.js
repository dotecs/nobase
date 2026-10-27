/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/admin/learn/authoring': ['./prompts/**/*'],
    '/admin/learn/packs': ['./content/learn/packs/**/*'],
    '/api/learn/jobs/run': ['./prompts/**/*'],
  },
  experimental: {
    cssChunking: 'strict',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
