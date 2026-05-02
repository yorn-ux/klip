/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Only use this if you're using Pages Router
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;