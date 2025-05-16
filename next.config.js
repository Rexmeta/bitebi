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
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://messari.io;
              style-src 'self' 'unsafe-inline' https://messari.io;
              img-src 'self' data: https://assets.coingecko.com https://*.google.com https://*.doubleclick.net https://www.google-analytics.com https://messari.io https://googleads.g.doubleclick.net;
              frame-src 'self' https://*.google.com https://www.google.com https://messari.io https://googleads.g.doubleclick.net;
              connect-src 'self' https://api.coingecko.com https://*.google.com https://www.google-analytics.com https://messari.io https://ep1.adtrafficquality.google;
              font-src 'self' https://messari.io;
              object-src 'none';
              media-src 'self';
              worker-src 'self';
              child-src 'self';
              form-action 'self';
              base-uri 'self';
              manifest-src 'self';
              frame-ancestors 'none';
              upgrade-insecure-requests;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ]
  }
}

module.exports = withPWA(nextConfig)