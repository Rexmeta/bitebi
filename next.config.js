/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')

const config = {
  reactStrictMode: true,
}

module.exports = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
})(config)