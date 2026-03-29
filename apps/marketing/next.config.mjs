/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Keep heavy 3D libs out of accidental server bundles on Cloudflare Workers */
  serverExternalPackages: ["three", "gsap"],
};

export default nextConfig;
