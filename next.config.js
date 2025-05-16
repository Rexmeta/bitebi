const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['assets.coingecko.com'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://assets.coingecko.com https://*.google.com https://*.doubleclick.net; frame-src 'self' https://*.google.com; connect-src 'self' https://api.coingecko.com https://*.google.com;"
          }
        ]
      }
    ]
  }
}

module.exports = withPWA(nextConfig)