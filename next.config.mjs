import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self' https://*.tradingview.com;
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://messari.io https://*.googleapis.com https://*.google.com https://*.tradingview.com https://*.tradingview-charts.com https://*.tradingview-widget.com;
              style-src 'self' 'unsafe-inline' https://*.tradingview.com https://*.tradingview-widget.com;
              img-src 'self' data: blob: https://*.ytimg.com https://*.googleapis.com https://*.google.com https://*.tradingview.com https://*.tradingview-widget.com;
              connect-src 'self' https://*.googleapis.com https://*.google.com https://*.tradingview.com wss://*.tradingview.com https://*.tradingview-widget.com;
              frame-src 'self' https://www.youtube.com https://*.tradingview.com https://*.tradingview-widget.com https://s.tradingview.com https://*.google.com https://www.google.com https://messari.io https://googleads.g.doubleclick.net;
              media-src 'self' blob:;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'none';
              block-all-mixed-content;
              upgrade-insecure-requests;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ]
  }
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})(nextConfig) 