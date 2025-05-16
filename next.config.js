/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')

const config = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com"
          }
        ]
      }
    ]
  }
}

module.exports = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
})(config)