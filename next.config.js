/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable the default body parser so API routes can consume raw streams
  // This is critical for multipart/form-data binary file uploads
  experimental: {
    serverComponentsExternalPackages: ['busboy'],
  },

  // Allow larger API payloads for file conversion workloads (10MB)
  serverRuntimeConfig: {
    maxPayloadSize: '10mb',
  },

  // Ensure the app router is enabled (default in Next.js 13+)
  reactStrictMode: true,

  // Disable response size limits for streaming binary outputs
  async headers() {
    return [
      {
        source: '/api/convert/:path*',
        headers: [
          // Allow large binary payloads through the edge layer
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
    ];
  },

  // Production-level output optimization
  output: 'standalone',

  // Webpack config to suppress busboy binary warnings on client bundle
  // and prevent pdfjs-dist from pulling in the optional native 'canvas'
  // package (used both client-side in the edit-pdf tool and server-side
  // for text extraction/redaction — see comment below).
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        buffer: false,
      };
    }
    // canvas is an optional native dependency of pdfjs-dist's Node build
    // path. We never need actual rendering output server-side (only text
    // geometry, for text extraction/redaction in lib/pdf-text.js and
    // lib/pdf-redact.js), and the browser-side use in the edit-pdf tool
    // renders into a real <canvas> element — so the native module is
    // aliased away everywhere; pdfjs-dist degrades gracefully without it.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
