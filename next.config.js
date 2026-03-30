const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/www\.youtube\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'youtube-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        }
      }
    },
    {
      urlPattern: /^https:\/\/www\.googleapis\.com\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'youtube-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 // 1 hour
        }
      }
    }
  ]
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['**.replit.dev', '**.repl.co'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/.local/**', '**/.git/**', '**/node_modules/**'],
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i1.ytimg.com' },
      { protocol: 'https', hostname: 'i2.ytimg.com' },
      { protocol: 'https', hostname: 'i3.ytimg.com' },
      { protocol: 'https', hostname: 'i4.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
    ],
  },
  async headers() {
    return []
  },
  async rewrites() {
    return [
      {
        source: '/stablecoin',
        destination: '/stablecoins'
      }
    ]
  }
}

module.exports = withPWA(nextConfig)