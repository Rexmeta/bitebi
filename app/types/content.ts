// ============================================================
// Bitebi 자동 생성 콘텐츠 타입 정의
// ============================================================

/** 일일 시장 리포트 */
export interface DailyReport {
  date: string           // "2026-04-01"
  generatedAt: string    // ISO timestamp
  title: string
  summary: string        // 3문장 요약
  marketOverview: {
    totalMarketCap: number
    btcDominance: number
    fearGreedIndex: number
    fearGreedLabel: string
    topGainers: CoinSnapshot[]
    topLosers: CoinSnapshot[]
  }
  btcAnalysis: string    // AI 생성 BTC 분석 (300~500자)
  ethAnalysis: string    // AI 생성 ETH 분석 (200~400자)
  marketOutlook: string  // AI 전망 코멘트 (200~400자)
  keyEvents: string[]    // 오늘의 주요 이벤트 5개
  relatedNews: NewsSnippet[]
  seoKeywords: string[]
}

/** 코인 심층 분석 */
export interface CoinAnalysis {
  slug: string           // "bitcoin-2026-week-14"
  coinId: string         // "bitcoin"
  coinName: string       // "Bitcoin"
  coinSymbol: string     // "BTC"
  weekNumber: number
  year: number
  generatedAt: string
  title: string
  priceData: {
    current: number
    weekHigh: number
    weekLow: number
    weekChange: number
    marketCap: number
    volume24h: number
  }
  technicalAnalysis: string  // AI 기술적 분석 (400~600자)
  onchainMetrics: string     // 온체인 지표 분석 (300~500자)
  marketSentiment: string    // 시장 심리 분석 (200~400자)
  outlook: string            // 전망 (200~400자)
  relatedNews: NewsSnippet[]
  seoKeywords: string[]
}

/** 트렌딩 토픽 기사 */
export interface TopicArticle {
  slug: string           // "bitcoin-etf"
  keyword: string        // "Bitcoin ETF"
  keywordKo: string      // "비트코인 ETF"
  generatedAt: string
  title: string
  introduction: string   // 도입부 (200~300자)
  mainContent: string    // 본문 (500~800자)
  conclusion: string     // 결론 (150~250자)
  relatedNews: NewsSnippet[]
  relatedCoins: string[] // coin IDs
  seoKeywords: string[]
  updateCount: number    // 업데이트 횟수
}

/** 암호화폐 용어 사전 */
export interface GlossaryTerm {
  slug: string           // "defi"
  term: string           // "DeFi"
  termKo: string         // "디파이"
  category: 'basic' | 'defi' | 'trading' | 'technical' | 'regulation'
  generatedAt: string
  shortDefinition: string  // 한 줄 정의 (50~100자)
  fullExplanation: string  // 상세 설명 (400~700자)
  howItWorks: string       // 작동 원리 (300~500자)
  examples: string[]       // 실제 예시 3개
  relatedTerms: string[]   // 관련 용어 슬러그
  relatedCoins: string[]   // 관련 코인 IDs
  seoKeywords: string[]
}

/** 플래시 브리핑 (짧은 일일 요약) */
export interface FlashBrief {
  id: string             // "2026-04-01-morning"
  date: string
  session: 'morning' | 'afternoon'
  generatedAt: string
  title: string
  bullets: string[]      // 핵심 5줄
  marketSnapshot: {
    btcPrice: number
    btcChange: number
    totalMarketCap: number
    fearGreedIndex: number
  }
  emoji: string          // 분위기 이모지 🚀📉🔥
}

/** 공통 - 뉴스 스니펫 */
export interface NewsSnippet {
  title: string
  link: string
  source: string
  pubDate: string
  snippet: string
}

/** 공통 - 코인 스냅샷 */
export interface CoinSnapshot {
  id: string
  name: string
  symbol: string
  price: number
  change24h: number
  marketCap: number
  image?: string
}

/** 자동 생성 콘텐츠 인덱스 (public/content/index.json) */
export interface ContentIndex {
  lastUpdated: string
  dailyReports: string[]      // 날짜 배열 ["2026-04-01", ...]
  coinAnalyses: string[]      // slug 배열
  topics: string[]            // slug 배열
  glossaryTerms: string[]     // slug 배열
  flashBriefs: string[]       // id 배열
}
