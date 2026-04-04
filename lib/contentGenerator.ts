// ============================================================
// Bitebi AI 콘텐츠 자동 생성 라이브러리
// OpenAI API를 사용해 5가지 콘텐츠 타입 생성
// ============================================================

import OpenAI from 'openai'
import type {
  DailyReport,
  CoinAnalysis,
  TopicArticle,
  GlossaryTerm,
  FlashBrief,
  CoinSnapshot,
  NewsSnippet,
} from '@/app/types/content'

// ─── OpenAI 클라이언트 초기화 ────────────────────────────────
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey, baseURL })
}

const MODEL = 'gpt-5-mini'

async function aiGenerate(prompt: string, systemPrompt?: string): Promise<string> {
  const client = getOpenAIClient()
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 1200,
    temperature: 0.7,
  })
  return response.choices[0]?.message?.content?.trim() ?? ''
}

// ─── 데이터 수집 헬퍼 ────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitebi.vercel.app'

export async function fetchCoinMarket(): Promise<CoinSnapshot[]> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1',
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol?.toUpperCase(),
      price: c.current_price ?? 0,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap ?? 0,
      image: c.image,
    }))
  } catch {
    return []
  }
}

export async function fetchMarketGlobal(): Promise<{
  totalMarketCap: number
  btcDominance: number
}> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return { totalMarketCap: 0, btcDominance: 0 }
    const json = await res.json()
    return {
      totalMarketCap: json.data?.total_market_cap?.usd ?? 0,
      btcDominance: json.data?.market_cap_percentage?.btc ?? 0,
    }
  } catch {
    return { totalMarketCap: 0, btcDominance: 0 }
  }
}

export async function fetchFearGreed(): Promise<{ value: number; label: string }> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 300 },
    })
    if (!res.ok) return { value: 50, label: 'Neutral' }
    const json = await res.json()
    return {
      value: parseInt(json.data?.[0]?.value ?? '50'),
      label: json.data?.[0]?.value_classification ?? 'Neutral',
    }
  } catch {
    return { value: 50, label: 'Neutral' }
  }
}

export async function fetchLatestNews(limit = 10): Promise<NewsSnippet[]> {
  try {
    const Parser = (await import('rss-parser')).default
    const parser = new Parser()
    const feed = await parser.parseURL('https://cointelegraph.com/rss')
    return feed.items.slice(0, limit).map((item) => ({
      title: item.title ?? '',
      link: item.link ?? '',
      source: 'Cointelegraph',
      pubDate: item.pubDate ?? '',
      snippet: (item.contentSnippet ?? '').slice(0, 200),
    }))
  } catch {
    return []
  }
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
}

// ─── 1. 일일 시장 리포트 생성 ────────────────────────────────
export async function generateDailyReport(dateStr: string): Promise<DailyReport> {
  const [coins, global, fg, news] = await Promise.all([
    fetchCoinMarket(),
    fetchMarketGlobal(),
    fetchFearGreed(),
    fetchLatestNews(8),
  ])

  const btc = coins.find((c) => c.id === 'bitcoin')
  const eth = coins.find((c) => c.id === 'ethereum')
  const topGainers = [...coins].sort((a, b) => b.change24h - a.change24h).slice(0, 3)
  const topLosers = [...coins].sort((a, b) => a.change24h - b.change24h).slice(0, 3)

  const mktCapT = (global.totalMarketCap / 1e12).toFixed(2)
  const newsHeadlines = news.slice(0, 5).map((n) => `- ${n.title}`).join('\n')

  const systemPrompt = `당신은 암호화폐 전문 애널리스트입니다. 한국어로 전문적이고 읽기 쉽게 작성하세요. 
  JSON 형식 없이 순수 텍스트만 반환하세요. 마크다운 없이 평문으로 작성하세요.`

  const [btcAnalysis, ethAnalysis, marketOutlook, keyEventsRaw, summaryRaw] = await Promise.all([
    aiGenerate(
      `비트코인 현재 가격 $${btc?.price?.toLocaleString() ?? 'N/A'}, 24시간 변동 ${btc?.change24h?.toFixed(2) ?? 0}% 기준으로 오늘의 비트코인 시장 분석을 300~400자로 작성해줘. 주요 지지/저항선, 거래량 분석, 단기 전망 포함.`,
      systemPrompt
    ),
    aiGenerate(
      `이더리움 현재 가격 $${eth?.price?.toLocaleString() ?? 'N/A'}, 24시간 변동 ${eth?.change24h?.toFixed(2) ?? 0}% 기준으로 오늘의 이더리움 분석을 200~300자로 작성해줘. 생태계 현황과 단기 전망 포함.`,
      systemPrompt
    ),
    aiGenerate(
      `전체 암호화폐 시장 시가총액 $${mktCapT}조, 비트코인 도미넌스 ${global.btcDominance?.toFixed(1)}%, 공포탐욕지수 ${fg.value}(${fg.label}) 기준으로 향후 24~48시간 시장 전망을 200~300자로 작성해줘.`,
      systemPrompt
    ),
    aiGenerate(
      `${dateStr} 암호화폐 시장의 주목할 이슈를 아래 뉴스 헤드라인을 참고해서 5가지 핵심 포인트로 정리해줘. 각 포인트는 한 줄로 작성.\n\n${newsHeadlines}\n\n형식: 1. ... 2. ... 3. ... 4. ... 5. ...`,
      systemPrompt
    ),
    aiGenerate(
      `${dateStr} 암호화폐 시장 요약을 3문장으로 작성해줘. 시장 전체 흐름, BTC/ETH 현황, 투자자 심리를 포함해야 함.`,
      systemPrompt
    ),
  ])

  const keyEvents = keyEventsRaw
    .split('\n')
    .filter((l) => l.match(/^\d+\./))
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5)

  const dateObj = new Date(dateStr)
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()

  return {
    date: dateStr,
    generatedAt: new Date().toISOString(),
    title: `${dateStr} 암호화폐 시장 일일 분석 리포트`,
    summary: summaryRaw,
    marketOverview: {
      totalMarketCap: global.totalMarketCap,
      btcDominance: global.btcDominance,
      fearGreedIndex: fg.value,
      fearGreedLabel: fg.label,
      topGainers,
      topLosers,
    },
    btcAnalysis,
    ethAnalysis,
    marketOutlook,
    keyEvents: keyEvents.length > 0 ? keyEvents : ['시장 분석 중...'],
    relatedNews: news.slice(0, 5),
    seoKeywords: [
      `${month}월 ${day}일 비트코인 시세`,
      `${dateStr} 암호화폐 분석`,
      '오늘 비트코인 가격',
      '암호화폐 시장 전망',
      `비트코인 ${dateStr}`,
      '코인 시세 분석',
    ],
  }
}

// ─── 2. 코인 심층 분석 생성 ──────────────────────────────────
export async function generateCoinAnalysis(coinId: string): Promise<CoinAnalysis> {
  const coins = await fetchCoinMarket()
  const coin = coins.find((c) => c.id === coinId) ?? coins[0]
  const news = await fetchLatestNews(10)
  const coinNews = news
    .filter((n) =>
      n.title.toLowerCase().includes(coin.symbol.toLowerCase()) ||
      n.title.toLowerCase().includes(coin.name.toLowerCase())
    )
    .slice(0, 4)

  const now = new Date()
  const week = getWeekNumber(now)
  const slug = `${coinId}-${now.getFullYear()}-week-${week}`

  const systemPrompt = `당신은 암호화폐 전문 기술적 분석가입니다. 한국어로 전문적으로 작성하세요. 마크다운 없이 평문으로 작성하세요.`

  const [technical, onchain, sentiment, outlook] = await Promise.all([
    aiGenerate(
      `${coin.name}(${coin.symbol}) 가격 $${coin.price.toLocaleString()}, 24시간 변동 ${coin.change24h.toFixed(2)}%, 시가총액 $${(coin.marketCap / 1e9).toFixed(2)}B 기준으로 이번 주 기술적 분석을 400~500자로 작성해줘. RSI, 이동평균선, 지지/저항선 관점 포함.`,
      systemPrompt
    ),
    aiGenerate(
      `${coin.name}(${coin.symbol})의 온체인 지표와 네트워크 건전성에 대해 300~400자로 분석해줘. 거래량 트렌드, 주요 지갑 동향, 네트워크 활동 관점에서 설명.`,
      systemPrompt
    ),
    aiGenerate(
      `${coin.name}(${coin.symbol}) 관련 시장 심리와 투자자 동향을 200~300자로 분석해줘. 기관 투자자 동향, 소셜 미디어 분위기, 공포탐욕 관점 포함.`,
      systemPrompt
    ),
    aiGenerate(
      `${coin.name}(${coin.symbol})의 단기(1주일)~중기(1개월) 가격 전망을 200~300자로 작성해줘. 핵심 모니터링 포인트와 위험 요소 포함.`,
      systemPrompt
    ),
  ])

  return {
    slug,
    coinId: coin.id,
    coinName: coin.name,
    coinSymbol: coin.symbol,
    weekNumber: week,
    year: now.getFullYear(),
    generatedAt: now.toISOString(),
    title: `${coin.name} 주간 심층 분석 - ${now.getFullYear()}년 ${week}주차`,
    priceData: {
      current: coin.price,
      weekHigh: coin.price * 1.05,
      weekLow: coin.price * 0.95,
      weekChange: coin.change24h,
      marketCap: coin.marketCap,
      volume24h: coin.price * 1000000,
    },
    technicalAnalysis: technical,
    onchainMetrics: onchain,
    marketSentiment: sentiment,
    outlook,
    relatedNews: coinNews,
    seoKeywords: [
      `${coin.name} 주간 분석`,
      `${coin.symbol} 시세 전망`,
      `${coin.name} 기술적 분석`,
      `${coin.symbol} 가격 예측`,
      `${now.getFullYear()}년 ${week}주차 ${coin.name}`,
    ],
  }
}

// ─── 3. 트렌딩 토픽 기사 생성 ────────────────────────────────
const TRENDING_TOPICS = [
  { slug: 'bitcoin-etf', keyword: 'Bitcoin ETF', keywordKo: '비트코인 ETF' },
  { slug: 'ethereum-staking', keyword: 'Ethereum Staking', keywordKo: '이더리움 스테이킹' },
  { slug: 'defi-protocol', keyword: 'DeFi Protocol', keywordKo: '디파이 프로토콜' },
  { slug: 'crypto-regulation', keyword: 'Crypto Regulation', keywordKo: '암호화폐 규제' },
  { slug: 'bitcoin-halving', keyword: 'Bitcoin Halving', keywordKo: '비트코인 반감기' },
  { slug: 'nft-market', keyword: 'NFT Market', keywordKo: 'NFT 시장' },
  { slug: 'altcoin-season', keyword: 'Altcoin Season', keywordKo: '알트코인 시즌' },
  { slug: 'web3-gaming', keyword: 'Web3 Gaming', keywordKo: '웹3 게임' },
  { slug: 'crypto-ai', keyword: 'AI Crypto', keywordKo: 'AI 암호화폐' },
  { slug: 'layer2-scaling', keyword: 'Layer 2 Scaling', keywordKo: '레이어2 확장성' },
]

export { TRENDING_TOPICS }

export async function generateTopicArticle(slug: string): Promise<TopicArticle> {
  const topic = TRENDING_TOPICS.find((t) => t.slug === slug) ?? TRENDING_TOPICS[0]
  const news = await fetchLatestNews(15)
  const relatedNews = news
    .filter((n) =>
      n.title.toLowerCase().includes(topic.keyword.split(' ')[0].toLowerCase())
    )
    .slice(0, 4)

  const systemPrompt = `당신은 암호화폐 전문 저널리스트입니다. 한국어로 흥미롭고 정보가 풍부하게 작성하세요. 마크다운 없이 평문으로 작성하세요.`

  const [intro, main, conclusion] = await Promise.all([
    aiGenerate(
      `${topic.keywordKo}(${topic.keyword})에 대한 기사 도입부를 200~250자로 작성해줘. 독자의 관심을 끌고 왜 이것이 중요한지 설명.`,
      systemPrompt
    ),
    aiGenerate(
      `${topic.keywordKo}(${topic.keyword})에 대한 심층 분석 본문을 500~700자로 작성해줘. 현황, 주요 플레이어, 시장 영향, 투자자 관점 포함.`,
      systemPrompt
    ),
    aiGenerate(
      `${topic.keywordKo}(${topic.keyword})의 향후 전망과 투자자 체크포인트를 150~200자로 작성해줘.`,
      systemPrompt
    ),
  ])

  return {
    slug: topic.slug,
    keyword: topic.keyword,
    keywordKo: topic.keywordKo,
    generatedAt: new Date().toISOString(),
    title: `${topic.keywordKo} 완전 분석 가이드: 최신 동향과 전망`,
    introduction: intro,
    mainContent: main,
    conclusion,
    relatedNews,
    relatedCoins: [],
    seoKeywords: [
      topic.keywordKo,
      `${topic.keywordKo}란`,
      `${topic.keywordKo} 투자`,
      `${topic.keywordKo} 전망`,
      `${topic.keyword} 한국어`,
    ],
    updateCount: 1,
  }
}

// ─── 4. 암호화폐 용어 사전 생성 ──────────────────────────────
export const GLOSSARY_TERMS = [
  { slug: 'defi', term: 'DeFi', termKo: '디파이', category: 'defi' as const },
  { slug: 'staking', term: 'Staking', termKo: '스테이킹', category: 'defi' as const },
  { slug: 'yield-farming', term: 'Yield Farming', termKo: '이자 파밍', category: 'defi' as const },
  { slug: 'liquidity-pool', term: 'Liquidity Pool', termKo: '유동성 풀', category: 'defi' as const },
  { slug: 'smart-contract', term: 'Smart Contract', termKo: '스마트 컨트랙트', category: 'technical' as const },
  { slug: 'blockchain', term: 'Blockchain', termKo: '블록체인', category: 'basic' as const },
  { slug: 'halving', term: 'Halving', termKo: '반감기', category: 'basic' as const },
  { slug: 'market-cap', term: 'Market Cap', termKo: '시가총액', category: 'trading' as const },
  { slug: 'rsi', term: 'RSI', termKo: 'RSI 지표', category: 'trading' as const },
  { slug: 'whale', term: 'Whale', termKo: '고래', category: 'trading' as const },
  { slug: 'bull-market', term: 'Bull Market', termKo: '강세장', category: 'trading' as const },
  { slug: 'bear-market', term: 'Bear Market', termKo: '약세장', category: 'trading' as const },
  { slug: 'altcoin', term: 'Altcoin', termKo: '알트코인', category: 'basic' as const },
  { slug: 'dao', term: 'DAO', termKo: '다오', category: 'defi' as const },
  { slug: 'nft', term: 'NFT', termKo: 'NFT', category: 'basic' as const },
  { slug: 'layer2', term: 'Layer 2', termKo: '레이어2', category: 'technical' as const },
  { slug: 'gas-fee', term: 'Gas Fee', termKo: '가스비', category: 'technical' as const },
  { slug: 'dex', term: 'DEX', termKo: '탈중앙화 거래소', category: 'defi' as const },
  { slug: 'cold-wallet', term: 'Cold Wallet', termKo: '콜드 월렛', category: 'basic' as const },
  { slug: 'airdrop', term: 'Airdrop', termKo: '에어드롭', category: 'basic' as const },
]

export async function generateGlossaryTerm(slug: string): Promise<GlossaryTerm> {
  const termInfo = GLOSSARY_TERMS.find((t) => t.slug === slug) ?? GLOSSARY_TERMS[0]

  const systemPrompt = `당신은 암호화폐 교육 전문가입니다. 초보자도 쉽게 이해할 수 있도록 한국어로 친절하게 설명하세요. 마크다운 없이 평문으로 작성하세요.`

  const [shortDef, fullExp, howItWorks, examplesRaw] = await Promise.all([
    aiGenerate(
      `${termInfo.termKo}(${termInfo.term})를 50~80자로 한 줄 정의해줘.`,
      systemPrompt
    ),
    aiGenerate(
      `${termInfo.termKo}(${termInfo.term})에 대해 400~600자로 상세히 설명해줘. 개념, 등장 배경, 특징, 장단점 포함.`,
      systemPrompt
    ),
    aiGenerate(
      `${termInfo.termKo}(${termInfo.term})가 실제로 어떻게 작동하는지 300~400자로 설명해줘. 초보자도 이해할 수 있는 쉬운 언어 사용.`,
      systemPrompt
    ),
    aiGenerate(
      `${termInfo.termKo}(${termInfo.term})의 실제 사용 예시를 3가지 작성해줘. 각 예시는 1~2문장. 형식: 1. ... 2. ... 3. ...`,
      systemPrompt
    ),
  ])

  const examples = examplesRaw
    .split('\n')
    .filter((l) => l.match(/^\d+\./))
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)

  return {
    slug: termInfo.slug,
    term: termInfo.term,
    termKo: termInfo.termKo,
    category: termInfo.category,
    generatedAt: new Date().toISOString(),
    shortDefinition: shortDef,
    fullExplanation: fullExp,
    howItWorks,
    examples: examples.length > 0 ? examples : [examplesRaw.slice(0, 100)],
    relatedTerms: [],
    relatedCoins: [],
    seoKeywords: [
      `${termInfo.termKo}란`,
      `${termInfo.termKo} 뜻`,
      `${termInfo.termKo} 의미`,
      `${termInfo.term} 코인`,
      `암호화폐 ${termInfo.termKo}`,
      `${termInfo.termKo} 설명`,
    ],
  }
}

// ─── 5. 플래시 브리핑 생성 ───────────────────────────────────
export async function generateFlashBrief(
  dateStr: string,
  session: 'morning' | 'afternoon'
): Promise<FlashBrief> {
  const [coins, fg, news] = await Promise.all([
    fetchCoinMarket(),
    fetchFearGreed(),
    fetchLatestNews(5),
  ])

  const btc = coins.find((c) => c.id === 'bitcoin')
  const newsHeadlines = news.map((n) => `- ${n.title}`).join('\n')
  const sessionKo = session === 'morning' ? '오전' : '오후'

  const bulletsRaw = await aiGenerate(
    `${dateStr} ${sessionKo} 암호화폐 시장 핵심 브리핑을 5가지 불릿 포인트로 작성해줘.
    비트코인 가격: $${btc?.price?.toLocaleString() ?? 'N/A'} (${btc?.change24h?.toFixed(2) ?? 0}%)
    공포탐욕지수: ${fg.value} (${fg.label})
    최신 뉴스:
    ${newsHeadlines}
    
    각 포인트는 한 줄, 핵심만. 형식: 1. ... 2. ... 3. ... 4. ... 5. ...`,
    `암호화폐 전문가. 간결하고 핵심적으로 한국어로 작성. 마크다운 없이 평문.`
  )

  const bullets = bulletsRaw
    .split('\n')
    .filter((l) => l.match(/^\d+\./))
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5)

  const fearGreedEmoji =
    fg.value >= 75 ? '🔥' : fg.value >= 55 ? '🚀' : fg.value >= 45 ? '📊' : fg.value >= 25 ? '😰' : '💀'

  const global = await fetchMarketGlobal()

  return {
    id: `${dateStr}-${session}`,
    date: dateStr,
    session,
    generatedAt: new Date().toISOString(),
    title: `${dateStr} ${sessionKo} 코인 브리핑 ${fearGreedEmoji}`,
    bullets: bullets.length > 0 ? bullets : ['시장 분석 중...'],
    marketSnapshot: {
      btcPrice: btc?.price ?? 0,
      btcChange: btc?.change24h ?? 0,
      totalMarketCap: global.totalMarketCap,
      fearGreedIndex: fg.value,
    },
    emoji: fearGreedEmoji,
  }
}
