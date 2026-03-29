export interface Article {
  title: string
  link: string
  pubDate: string
  source: string
  keywords?: string[]
  contentSnippet?: string
  category?: string
}

export interface Coin {
  id: string
  symbol: string
  name: string
  market_cap_rank: number
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  image: string
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  channelTitle: string
  thumbnailUrl: string
  formattedDate: string
}

export interface StablecoinMetric {
  timestamp: string
  totalSupply: number
  marketCap: number
  volume24h: number
}

export interface StablecoinStats {
  circulation: number
  circulation_change_24h: number
  circulation_percent_change_24h: number
  name: string
  price: number
  price_percent_change_24h: number
  symbol: string
  volume: number
  volume_change_24h: number
  volume_percent_change_24h: number
}

export interface StablecoinData {
  [key: string]: StablecoinStats
}

export { type SocialFeed, type SocialSource } from './social'
export { type Topic, type TopicCategory, type TopicStats, type NewsItem } from './models/topic'
