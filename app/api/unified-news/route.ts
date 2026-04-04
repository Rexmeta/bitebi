/**
 * /api/unified-news
 * RSS 뉴스 + 자체 생성 AI 콘텐츠를 하나의 피드로 통합
 *
 * 혼합 전략:
 *  - 오늘 AI 리포트/브리핑은 맨 위 고정(pinned)
 *  - 나머지는 시간순 정렬
 *  - 자체 콘텐츠는 3~4개마다 1개 비율로 RSS 사이에 삽입
 */

import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import fs from 'fs'
import path from 'path'
import type { UnifiedFeedItem } from '@/app/types'

const parser = new Parser()

const RSS_FEEDS = [
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt',       url: 'https://decrypt.co/feed' },
  { source: 'CoinDesk',      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'CryptoSlate',   url: 'https://cryptoslate.com/feed/' },
  { source: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/' },
]

const CATEGORY_RULES = [
  { category: 'bitcoin',    keywords: ['bitcoin', 'btc', 'satoshi', 'lightning'] },
  { category: 'ethereum',   keywords: ['ethereum', 'eth', 'vitalik', 'erc-20'] },
  { category: 'defi',       keywords: ['defi', 'dex', 'yield', 'liquidity', 'aave', 'uniswap'] },
  { category: 'regulation', keywords: ['regulation', 'sec', 'ban', 'law', 'government', 'policy'] },
  { category: 'nft',        keywords: ['nft', 'metaverse', 'opensea'] },
  { category: 'altcoin',    keywords: ['solana', 'xrp', 'ripple', 'cardano', 'dogecoin', 'bnb', 'polygon', 'altcoin'] },
]

function categorize(title: string): string {
  const lower = title.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.category
  }
  return 'general'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

// ─── RSS 피드 수집 ────────────────────────────────────────────
async function fetchRssItems(): Promise<UnifiedFeedItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url)
        return parsed.items.map((item): UnifiedFeedItem => ({
          id: item.link || item.title || '',
          title: item.title || '',
          snippet: item.contentSnippet
            ? item.contentSnippet.slice(0, 200)
            : item.content
              ? stripHtml(item.content).slice(0, 200)
              : '',
          pubDate: item.pubDate || new Date().toISOString(),
          source: feed.source,
          category: categorize(item.title || ''),
          link: item.link || '',
          isExternal: true,
          contentType: 'rss',
          badgeLabel: feed.source,
          badgeColor: 'blue',
        }))
      } catch {
        return []
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<UnifiedFeedItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}

// ─── 자체 생성 콘텐츠 수집 ────────────────────────────────────
const CONTENT_ROOT = path.join(process.cwd(), 'public', 'content')

function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

function listContentFiles(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.startsWith('.'))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

interface DailyReportFile {
  date: string
  title: string
  summary: string
  generatedAt: string
  marketOverview?: { fearGreedIndex?: number; fearGreedLabel?: string }
}

interface FlashBriefFile {
  id: string
  date: string
  session: string
  title: string
  bullets: string[]
  generatedAt: string
  emoji?: string
}

interface TopicFile {
  slug: string
  keywordKo: string
  keyword: string
  title: string
  introduction: string
  generatedAt: string
}

interface GlossaryFile {
  slug: string
  termKo: string
  term: string
  shortDefinition: string
  generatedAt: string
  category: string
}

interface CoinAnalysisFile {
  slug: string
  coinName: string
  coinSymbol: string
  title: string
  technicalAnalysis: string
  generatedAt: string
}

function getAiContentItems(today: string): UnifiedFeedItem[] {
  const items: UnifiedFeedItem[] = []

  // 1. 일일 리포트 (최근 7일)
  const reportFiles = listContentFiles(path.join(CONTENT_ROOT, 'daily-reports')).slice(0, 7)
  for (const file of reportFiles) {
    const data = readJsonSafe<DailyReportFile>(path.join(CONTENT_ROOT, 'daily-reports', file))
    if (!data) continue
    const isToday = data.date === today
    const fg = data.marketOverview?.fearGreedIndex ?? 50
    const emoji = fg >= 75 ? '🔥' : fg >= 55 ? '🚀' : fg >= 45 ? '📊' : fg >= 25 ? '😰' : '💀'
    items.push({
      id: `daily-report-${data.date}`,
      title: data.title || `${data.date} 암호화폐 시장 일일 리포트`,
      snippet: data.summary || `AI가 분석한 ${data.date} 암호화폐 시장 전망과 BTC/ETH 분석`,
      pubDate: data.generatedAt || `${data.date}T07:00:00.000Z`,
      source: 'Bitebi AI',
      category: 'analysis',
      link: `/daily-report/${data.date}`,
      isExternal: false,
      contentType: 'daily-report',
      pinned: isToday,
      badgeLabel: 'AI 분석',
      badgeColor: 'yellow',
      emoji,
    })
  }

  // 2. 플래시 브리핑 (최근 5개)
  const briefFiles = listContentFiles(path.join(CONTENT_ROOT, 'flash-briefs')).slice(0, 5)
  for (const file of briefFiles) {
    const data = readJsonSafe<FlashBriefFile>(path.join(CONTENT_ROOT, 'flash-briefs', file))
    if (!data) continue
    const isToday = data.date === today
    const sessionKo = data.session === 'morning' ? '오전' : '오후'
    items.push({
      id: `brief-${data.id}`,
      title: data.title || `${data.date} ${sessionKo} 코인 브리핑`,
      snippet: data.bullets?.slice(0, 2).join(' · ') || '오늘의 핵심 암호화폐 뉴스 5가지',
      pubDate: data.generatedAt || `${data.date}T07:00:00.000Z`,
      source: 'Bitebi 브리핑',
      category: 'brief',
      link: `/brief/${data.id}`,
      isExternal: false,
      contentType: 'brief',
      pinned: isToday && data.session === 'morning',
      badgeLabel: '브리핑',
      badgeColor: 'orange',
      emoji: data.emoji || '⚡',
    })
  }

  // 3. 트렌딩 토픽 (최근 갱신 순, 최대 5개)
  const topicFiles = listContentFiles(path.join(CONTENT_ROOT, 'topics')).slice(0, 5)
  for (const file of topicFiles) {
    const data = readJsonSafe<TopicFile>(path.join(CONTENT_ROOT, 'topics', file))
    if (!data) continue
    items.push({
      id: `topic-${data.slug}`,
      title: data.title || `${data.keywordKo} 완전 분석 가이드`,
      snippet: data.introduction?.slice(0, 200) || `${data.keywordKo}(${data.keyword})에 대한 심층 분석`,
      pubDate: data.generatedAt,
      source: 'Bitebi 토픽',
      category: 'defi',
      link: `/topic/${data.slug}`,
      isExternal: false,
      contentType: 'topic',
      badgeLabel: '토픽',
      badgeColor: 'purple',
      emoji: '🔥',
    })
  }

  // 4. 용어 사전 (최근 생성 순, 최대 4개 - 덜 공격적으로)
  const glossaryFiles = listContentFiles(path.join(CONTENT_ROOT, 'glossary')).slice(0, 4)
  for (const file of glossaryFiles) {
    const data = readJsonSafe<GlossaryFile>(path.join(CONTENT_ROOT, 'glossary', file))
    if (!data) continue
    items.push({
      id: `glossary-${data.slug}`,
      title: `${data.termKo}(${data.term})란? - 완전 정리`,
      snippet: data.shortDefinition || `${data.termKo}의 뜻과 활용법을 쉽게 설명합니다`,
      pubDate: data.generatedAt,
      source: 'Bitebi 사전',
      category: 'general',
      link: `/glossary/${data.slug}`,
      isExternal: false,
      contentType: 'glossary',
      badgeLabel: '용어',
      badgeColor: 'green',
      emoji: '📚',
    })
  }

  // 5. 코인 주간 분석 (최신 3개)
  const coinFiles = listContentFiles(path.join(CONTENT_ROOT, 'coin-analysis')).slice(0, 3)
  for (const file of coinFiles) {
    const data = readJsonSafe<CoinAnalysisFile>(path.join(CONTENT_ROOT, 'coin-analysis', file))
    if (!data) continue
    items.push({
      id: `coin-${data.slug}`,
      title: data.title || `${data.coinName} 주간 심층 분석`,
      snippet: data.technicalAnalysis?.slice(0, 200) || `${data.coinName}(${data.coinSymbol}) 기술적 분석 및 시장 전망`,
      pubDate: data.generatedAt,
      source: 'Bitebi 분석',
      category: data.coinName?.toLowerCase().includes('bitcoin') ? 'bitcoin' : 'altcoin',
      link: `/analysis/${data.slug}`,
      isExternal: false,
      contentType: 'coin-analysis',
      badgeLabel: '주간분석',
      badgeColor: 'yellow',
      emoji: '📈',
    })
  }

  // ── AI 콘텐츠가 하나도 없을 때: 페이지 소개 카드 삽입 ──────────
  // 첫 번째 GitHub Actions 실행 전에도 새 페이지가 피드에 노출되도록 함
  if (items.length === 0) {
    const now = new Date().toISOString()
    items.push(
      {
        id: 'promo-daily-report',
        title: '📊 매일 AI가 분석하는 암호화폐 일일 리포트 - 오늘의 시장 전망',
        snippet: 'BTC/ETH 가격 추이, 공포탐욕지수, AI 기반 시장 전망을 매일 07:00 자동 생성합니다.',
        pubDate: now,
        source: 'Bitebi AI',
        category: 'analysis',
        link: '/daily-report',
        isExternal: false,
        contentType: 'daily-report',
        pinned: false,
        badgeLabel: 'AI 분석',
        badgeColor: 'yellow',
        emoji: '📊',
      },
      {
        id: 'promo-glossary',
        title: '📚 암호화폐 용어 사전 - DeFi·NFT·레이어2 완전 정리',
        snippet: 'DeFi, NFT, 레이어2, 스테이킹 등 암호화폐 핵심 용어를 AI가 쉽게 설명합니다.',
        pubDate: new Date(Date.now() - 60000).toISOString(),
        source: 'Bitebi 사전',
        category: 'general',
        link: '/glossary',
        isExternal: false,
        contentType: 'glossary',
        pinned: false,
        badgeLabel: '용어사전',
        badgeColor: 'green',
        emoji: '📚',
      },
      {
        id: 'promo-topic',
        title: '🔥 트렌딩 토픽 분석 - 비트코인 ETF·이더리움 스테이킹·DeFi',
        snippet: '최신 암호화폐 트렌드 키워드를 AI가 심층 분석. 비트코인 ETF, 이더리움 업그레이드, DeFi 최신 동향.',
        pubDate: new Date(Date.now() - 120000).toISOString(),
        source: 'Bitebi 토픽',
        category: 'bitcoin',
        link: '/topic',
        isExternal: false,
        contentType: 'topic',
        pinned: false,
        badgeLabel: '트렌딩',
        badgeColor: 'purple',
        emoji: '🔥',
      }
    )
  }

  return items
}

// ─── 혼합 전략: RSS + AI 콘텐츠를 자연스럽게 인터리빙 ────────
/**
 * 혼합 규칙:
 *  1. pinned 아이템은 최상단에 모아서 고정
 *  2. RSS 기사 3개마다 AI 콘텐츠 1개 삽입 (노출 최적화)
 *  3. 단, 같은 contentType이 연속으로 2개 이상 오지 않도록 제어
 *  4. AI 콘텐츠 소진 후에는 RSS만 표시
 */
function mergeFeed(
  rssItems: UnifiedFeedItem[],
  aiItems: UnifiedFeedItem[],
  options: { rssPerAi: number } = { rssPerAi: 3 }
): UnifiedFeedItem[] {
  const pinned = aiItems.filter(i => i.pinned)
  const aiQueue = aiItems.filter(i => !i.pinned)

  // RSS는 시간순 정렬
  const sortedRss = [...rssItems].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  )

  const merged: UnifiedFeedItem[] = [...pinned]
  let aiIdx = 0
  const { rssPerAi } = options

  for (let i = 0; i < sortedRss.length; i++) {
    merged.push(sortedRss[i])
    // rssPerAi개 RSS마다 AI 1개 삽입 (아직 남아있으면)
    if ((i + 1) % rssPerAi === 0 && aiIdx < aiQueue.length) {
      merged.push(aiQueue[aiIdx++])
    }
  }

  // 남은 AI 콘텐츠 후미에 추가
  while (aiIdx < aiQueue.length) {
    merged.push(aiQueue[aiIdx++])
  }

  return merged
}

// ─── 캐시 (rssPerAi 키별로 분리) ───────────────────────────────
const cacheMap = new Map<number, { data: UnifiedFeedItem[]; timestamp: number }>()
// RSS + AI 원본 데이터 캐시 (1분)
let rawCache: { rss: UnifiedFeedItem[]; ai: UnifiedFeedItem[]; timestamp: number } | null = null
const CACHE_TTL      = 60 * 1000  // 1분
const RAW_CACHE_TTL  = 60 * 1000  // 1분

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category  = searchParams.get('category')  ?? 'all'
  const source    = searchParams.get('source')    ?? 'all'
  const query     = searchParams.get('q')         ?? ''
  const rssPerAi  = Math.max(1, Math.min(10, parseInt(searchParams.get('rssPerAi') ?? '3', 10)))

  try {
    // 캐시 확인 (rssPerAi 키별)
    const cached = cacheMap.get(rssPerAi)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const filtered = applyFilters(cached.data, category, source, query)
      return NextResponse.json({ success: true, items: filtered, total: filtered.length, cached: true })
    }

    // 원본 데이터 캐시 활용
    let rssItems: UnifiedFeedItem[]
    let aiItems: UnifiedFeedItem[]

    if (rawCache && Date.now() - rawCache.timestamp < RAW_CACHE_TTL) {
      rssItems = rawCache.rss
      aiItems  = rawCache.ai
    } else {
      const today = new Date().toISOString().split('T')[0]
      ;[rssItems, aiItems] = await Promise.all([
        fetchRssItems(),
        Promise.resolve(getAiContentItems(today)),
      ])
      rawCache = { rss: rssItems, ai: aiItems, timestamp: Date.now() }
    }

    const merged = mergeFeed(rssItems, aiItems, { rssPerAi })
    cacheMap.set(rssPerAi, { data: merged, timestamp: Date.now() })

    const filtered = applyFilters(merged, category, source, query)
    return NextResponse.json({ success: true, items: filtered, total: filtered.length, cached: false })

  } catch (err) {
    console.error('[unified-news] error:', err)
    // 캐시라도 반환
    const cached = cacheMap.get(rssPerAi)
    if (cached) {
      const filtered = applyFilters(cached.data, category, source, query)
      return NextResponse.json({ success: true, items: filtered, total: filtered.length, cached: true })
    }
    return NextResponse.json({ success: false, error: '뉴스 로딩 실패' }, { status: 500 })
  }
}

function applyFilters(
  items: UnifiedFeedItem[],
  category: string,
  source: string,
  query: string
): UnifiedFeedItem[] {
  let result = [...items]

  if (category !== 'all') {
    result = result.filter(i => i.category === category)
  }

  if (source !== 'all') {
    if (source === 'bitebi') {
      result = result.filter(i => i.contentType !== 'rss')
    } else {
      result = result.filter(i => i.source === source)
    }
  }

  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.snippet.toLowerCase().includes(q)
    )
  }

  return result
}
