const nextConfig = {
  experimental: {
    turbo: false, // Only if this field is allowed (depends on Next version)
    swcPlugins: [] // Empty any plugins
  },
  compiler: {
    // This disables SWC-specific minifier
    removeConsole: false,
    emotion: false
  }
};

export default nextConfig;
