export interface Article {
  title: string
  link: string
  pubDate: string
  source: string
  keywords?: string[]
  contentSnippet?: string
  category?: string
}

/**
 * RSS 뉴스 + 자체 생성 콘텐츠를 통합한 피드 아이템
 * contentType으로 구분, 자체생성은 내부 라우팅 사용
 */
export interface UnifiedFeedItem {
  id: string                  // 고유 ID (link 또는 slug)
  title: string
  snippet: string             // 2~3줄 미리보기
  pubDate: string             // ISO 날짜
  source: string              // "Cointelegraph" | "Bitebi AI" | "Bitebi 분석" 등
  category: string            // "bitcoin" | "defi" | "analysis" | "glossary" | "brief"
  link: string                // 외부 URL (RSS) 또는 내부 경로 (/daily-report/...)
  isExternal: boolean         // true = 새 탭, false = Next.js Link
  contentType:
    | 'rss'          // 기존 RSS 피드
    | 'daily-report' // 일일 시장 리포트
    | 'coin-analysis'// 코인 주간 분석
    | 'topic'        // 트렌딩 토픽
    | 'glossary'     // 용어 사전
    | 'brief'        // 플래시 브리핑
  pinned?: boolean            // 상단 고정 여부 (오늘 리포트, 오늘 브리핑)
  badgeLabel?: string         // "AI 분석" | "용어" | "브리핑" 등
  badgeColor?: 'yellow' | 'blue' | 'green' | 'purple' | 'orange'
  emoji?: string              // 🔥 📊 📚 ⚡ 등
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

export type YouTubeCategory = '시장 분석' | '교육/입문' | '뉴스' | '기술/개발'
export type YouTubeLanguage = 'ko' | 'en'

export interface YouTubeChannel {
  id: string
  name: string
  language: YouTubeLanguage
  category: YouTubeCategory
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  channelTitle: string
  thumbnailUrl: string
  thumbnailFallbacks?: string[]
  formattedDate: string
  category: YouTubeCategory
  language: YouTubeLanguage
  channelId: string
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
