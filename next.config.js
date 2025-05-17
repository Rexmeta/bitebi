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
  images: {
    domains: ['assets.coingecko.com', 'i.ytimg.com', 'yt3.ggpht.com'],
  },
  async headers() {
    return []
  }
}

module.exports = withPWA(nextConfig)