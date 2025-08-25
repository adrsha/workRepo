const nextConfig = {
    productionBrowserSourceMaps: true,
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                net: false,
                tls: false,
                fs: false,
            };
            config.optimization.minimize = false;
        }
        return config;
    },
    output: 'standalone',
    compiler: {
        // This disables SWC-specific minifier
        removeConsole: false,
        emotion: false
    }
};

export default nextConfig;
