import { MetadataRoute } from 'next'

const SITE_URL = 'https://bitebi.vercel.app'

const TOP_COINS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
  'ripple', 'usd-coin', 'cardano', 'dogecoin', 'avalanche-2',
  'polkadot', 'chainlink', 'tron', 'polygon-ecosystem-token', 'shiba-inu',
  'litecoin', 'bitcoin-cash', 'uniswap', 'stellar', 'cosmos',
  'monero', 'ethereum-classic', 'hedera-hashgraph', 'filecoin', 'internet-computer',
  'lido-dao', 'aptos', 'arbitrum', 'optimism', 'vechain',
  'near', 'the-graph', 'injective-protocol', 'render-token', 'sui',
  'aave', 'algorand', 'fantom', 'theta-token', 'axie-infinity',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/trending`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/social`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/whale-tracker`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/stablecoins`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/money-tracker`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/youtube`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.6,
    },
  ]

  const coinPages: MetadataRoute.Sitemap = TOP_COINS.map((coinId) => ({
    url: `${SITE_URL}/coin/${coinId}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...coinPages]
}
