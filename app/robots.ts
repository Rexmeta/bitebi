import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/with-ai/', '/aggregator/'],
      },
    ],
    sitemap: 'https://bitebi.vercel.app/sitemap.xml',
  }
}
