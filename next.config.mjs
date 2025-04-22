/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false, // turn off Rust-based minifier
  experimental: {
    swcPlugins: [],  // make sure none are used
    turbo: false     // disable turbo as well if used
  }
};

export default nextConfig;
