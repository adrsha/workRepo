const nextConfig = {
  experimental: {
    swcPlugins: [] // Empty any plugins
  },
  compiler: {
    // This disables SWC-specific minifier
    removeConsole: false,
    emotion: false
  }
};

export default nextConfig;
