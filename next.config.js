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
      // YouTube 썸네일 이미지 캐싱 (i.ytimg.com, i1~i9.ytimg.com)
      urlPattern: /^https:\/\/i\d*\.ytimg\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'youtube-thumbnail-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
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
      // YouTube 썸네일 도메인 - i.ytimg.com, i1~i9.ytimg.com 모두 허용
      { protocol: 'https', hostname: '**.ytimg.com' },
      // YouTube 채널 아이콘 도메인
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: '**.ggpht.com' },
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