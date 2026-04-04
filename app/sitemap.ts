import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

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

// 용어 사전 슬러그 목록
const GLOSSARY_SLUGS = [
  'defi', 'staking', 'yield-farming', 'smart-contract', 'blockchain',
  'halving', 'market-cap', 'whale', 'bull-market', 'bear-market',
  'altcoin', 'dao', 'nft', 'layer2', 'gas-fee',
  'dex', 'cold-wallet', 'airdrop', 'rsi', 'liquidity-pool',
]

// 트렌딩 토픽 슬러그 목록
const TOPIC_SLUGS = [
  'bitcoin-etf', 'ethereum-staking', 'defi-protocol', 'crypto-regulation',
  'bitcoin-halving', 'nft-market', 'altcoin-season', 'web3-gaming',
  'crypto-ai', 'layer2-scaling',
]

// 자동 생성된 일일 리포트 목록 (public/content/index.json에서 읽기)
function getGeneratedContent(): {
  dailyReports: string[]
  coinAnalyses: string[]
  flashBriefs: string[]
} {
  try {
    const indexFile = path.join(process.cwd(), 'public', 'content', 'index.json')
    if (fs.existsSync(indexFile)) {
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'))
      return {
        dailyReports: index.dailyReports?.slice(0, 30) ?? [],
        coinAnalyses: index.coinAnalyses?.slice(0, 20) ?? [],
        flashBriefs: index.flashBriefs?.slice(0, 60) ?? [],
      }
    }
  } catch {}
  // 폴백: 최근 7일
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return { dailyReports: dates, coinAnalyses: [], flashBriefs: [] }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generated = getGeneratedContent()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/social`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/stablecoins`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/money-tracker`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/youtube`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.6 },
    { url: `${SITE_URL}/fear-greed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/whale-tracker`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    { url: `${SITE_URL}/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/stablecoin-tracker`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },

    // ── 자동 생성 콘텐츠 허브 페이지 ──
    { url: `${SITE_URL}/daily-report`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/glossary`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/topic`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]

  // 기존 코인 페이지
  const coinPages: MetadataRoute.Sitemap = TOP_COINS.map((coinId) => ({
    url: `${SITE_URL}/coin/${coinId}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }))

  // 스테이블코인 페이지
  const stablecoinPages: MetadataRoute.Sitemap = ['usdt', 'usdc', 'dai', 'busd', 'tusd', 'usdp', 'gusd'].map((symbol) => ({
    url: `${SITE_URL}/stablecoins/${symbol}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  // ── 자동 생성 콘텐츠 URL ────────────────────────────────
  // 일일 리포트 (매일 1개, 최근 30일)
  const dailyReportPages: MetadataRoute.Sitemap = generated.dailyReports.map((date) => ({
    url: `${SITE_URL}/daily-report/${date}`,
    lastModified: new Date(date),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  // 용어 사전 (20개 고정, SEO 장기 자산)
  const glossaryPages: MetadataRoute.Sitemap = GLOSSARY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/glossary/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  // 트렌딩 토픽 (10개 순환)
  const topicPages: MetadataRoute.Sitemap = TOPIC_SLUGS.map((slug) => ({
    url: `${SITE_URL}/topic/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // 코인 주간 분석
  const coinAnalysisPages: MetadataRoute.Sitemap = generated.coinAnalyses.map((slug) => ({
    url: `${SITE_URL}/analysis/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  // 플래시 브리핑
  const briefPages: MetadataRoute.Sitemap = generated.flashBriefs.map((id) => ({
    url: `${SITE_URL}/brief/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [
    ...staticPages,
    ...coinPages,
    ...stablecoinPages,
    ...dailyReportPages,
    ...glossaryPages,
    ...topicPages,
    ...coinAnalysisPages,
    ...briefPages,
  ]
}
