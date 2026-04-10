#!/usr/bin/env ts-node
/**
 * Bitebi 일일 AI 콘텐츠 자동 생성 스크립트
 * GitHub Actions에서 매일 실행됨
 *
 * 사용법:
 *   ts-node scripts/generate-daily-content.ts --date=2026-04-01 --types=all
 *   ts-node scripts/generate-daily-content.ts --types=daily,brief
 */

import fs from 'fs'
import path from 'path'
import { generateTextWithGemini } from '@/lib/geminiClient'

// ─── 환경 설정 ────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitebi.vercel.app'
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

// ─── CLI 인자 파싱 ────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')

const targetDate = getArg('date') ?? new Date().toISOString().split('T')[0]
const typesArg = getArg('types') ?? 'all'
const types = typesArg === 'all'
  ? ['daily', 'coins', 'topics', 'glossary', 'brief']
  : typesArg.split(',')

console.log(`\n🤖 Bitebi 자동 콘텐츠 생성 시작`)
console.log(`📅 날짜: ${targetDate}`)
console.log(`📦 타입: ${types.join(', ')}`)
console.log(`🔗 모델: ${MODEL}\n`)

// ─── 디렉토리 설정 ────────────────────────────────────────────
const CONTENT_ROOT = path.join(process.cwd(), 'public', 'content')
const DIRS = {
  daily: path.join(CONTENT_ROOT, 'daily-reports'),
  coins: path.join(CONTENT_ROOT, 'coin-analysis'),
  topics: path.join(CONTENT_ROOT, 'topics'),
  glossary: path.join(CONTENT_ROOT, 'glossary'),
  brief: path.join(CONTENT_ROOT, 'flash-briefs'),
}
Object.values(DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }))

// ─── 유틸 함수 ────────────────────────────────────────────────
function saveJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  ✅ 저장: ${path.relative(process.cwd(), filePath)}`)
}

async function aiText(prompt: string, system?: string): Promise<string> {
  return generateTextWithGemini(prompt, system)
}

// ─── 데이터 수집 ──────────────────────────────────────────────
async function fetchCoins() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1'
    )
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function fetchGlobal() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global')
    if (!res.ok) return null
    return (await res.json()).data
  } catch { return null }
}

async function fetchFearGreed() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    if (!res.ok) return { value: 50, label: 'Neutral' }
    const json = await res.json()
    return { value: parseInt(json.data[0].value), label: json.data[0].value_classification }
  } catch { return { value: 50, label: 'Neutral' } }
}

async function fetchNews(limit = 8) {
  try {
    // rss-parser는 Node.js 환경에서 직접 import
    const { default: Parser } = await import('rss-parser')
    const parser = new Parser()
    const feed = await parser.parseURL('https://cointelegraph.com/rss')
    return feed.items.slice(0, limit).map((i: any) => ({
      title: i.title ?? '',
      link: i.link ?? '',
      source: 'Cointelegraph',
      pubDate: i.pubDate ?? '',
      snippet: (i.contentSnippet ?? '').slice(0, 200),
    }))
  } catch { return [] }
}

// ─── 1. 일일 리포트 생성 ──────────────────────────────────────
async function generateDailyReport(date: string) {
  const outputFile = path.join(DIRS.daily, `${date}.json`)
  if (fs.existsSync(outputFile)) {
    console.log(`  ⏭️  일일 리포트 이미 존재: ${date}`)
    return
  }

  console.log(`\n📊 일일 리포트 생성 중: ${date}`)

  const [coins, global, fg, news] = await Promise.all([
    fetchCoins(), fetchGlobal(), fetchFearGreed(), fetchNews(8)
  ])

  const btc = coins.find((c: any) => c.id === 'bitcoin')
  const eth = coins.find((c: any) => c.id === 'ethereum')
  const topGainers = [...coins].sort((a: any, b: any) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 3)
  const topLosers = [...coins].sort((a: any, b: any) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 3)
  const mktCapT = global ? (global.total_market_cap?.usd / 1e12).toFixed(2) : '?'
  const btcDom = global ? (global.market_cap_percentage?.btc ?? 0).toFixed(1) : '?'
  const headlines = news.slice(0, 5).map((n: any) => `- ${n.title}`).join('\n')

  const sys = `암호화폐 전문 애널리스트. 한국어 전문적이고 읽기 쉽게. 마크다운 없이 평문.`

  const [btcAnalysis, ethAnalysis, outlook, keyEventsRaw, summary] = await Promise.all([
    aiText(`비트코인 가격 $${btc?.current_price?.toLocaleString()}, 변동 ${btc?.price_change_percentage_24h?.toFixed(2)}%로 오늘 BTC 시장 분석 300~400자.`, sys),
    aiText(`이더리움 가격 $${eth?.current_price?.toLocaleString()}, 변동 ${eth?.price_change_percentage_24h?.toFixed(2)}%로 오늘 ETH 분석 200~300자.`, sys),
    aiText(`전체 시가총액 $${mktCapT}T, BTC도미넌스 ${btcDom}%, 공포탐욕 ${fg.value}(${fg.label})으로 향후 시장 전망 200~300자.`, sys),
    aiText(`${date} 주요 이슈 5가지:\n${headlines}\n\n형식: 1. ... 2. ... 3. ... 4. ... 5. ...`, sys),
    aiText(`${date} 시장 3문장 요약. BTC/ETH현황, 전체흐름, 투자심리.`, sys),
  ])

  const keyEvents = keyEventsRaw.split('\n').filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).slice(0, 5)
  const dateObj = new Date(date)

  const report = {
    date,
    generatedAt: new Date().toISOString(),
    title: `${date} 암호화폐 시장 일일 분석 리포트`,
    summary,
    marketOverview: {
      totalMarketCap: global?.total_market_cap?.usd ?? 0,
      btcDominance: global?.market_cap_percentage?.btc ?? 0,
      fearGreedIndex: fg.value,
      fearGreedLabel: fg.label,
      topGainers: topGainers.map((c: any) => ({ id: c.id, name: c.name, symbol: c.symbol?.toUpperCase(), price: c.current_price, change24h: c.price_change_percentage_24h, marketCap: c.market_cap })),
      topLosers: topLosers.map((c: any) => ({ id: c.id, name: c.name, symbol: c.symbol?.toUpperCase(), price: c.current_price, change24h: c.price_change_percentage_24h, marketCap: c.market_cap })),
    },
    btcAnalysis,
    ethAnalysis,
    marketOutlook: outlook,
    keyEvents: keyEvents.length > 0 ? keyEvents : ['시장 분석 중...'],
    relatedNews: news.slice(0, 5),
    seoKeywords: [
      `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 비트코인`,
      `${date} 암호화폐 분석`,
      '오늘 비트코인 가격',
      '암호화폐 시장 전망',
      '코인 시세 분석',
    ],
  }

  saveJson(outputFile, report)
}

// ─── 2. 코인 주간 분석 생성 ───────────────────────────────────
async function generateCoinAnalyses() {
  const coins = ['bitcoin', 'ethereum', 'solana']
  const allCoins = await fetchCoins()
  const now = new Date()
  const week = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)
  const sys = `암호화폐 기술적 분석가. 한국어 전문적으로. 마크다운 없이.`

  for (const coinId of coins) {
    const slug = `${coinId}-${now.getFullYear()}-week-${week}`
    const outputFile = path.join(DIRS.coins, `${slug}.json`)
    if (fs.existsSync(outputFile)) {
      console.log(`  ⏭️  코인 분석 이미 존재: ${slug}`)
      continue
    }
    console.log(`\n💎 코인 분석 생성: ${coinId} (${slug})`)

    const coin = allCoins.find((c: any) => c.id === coinId) ?? allCoins[0]
    const [technical, onchain, sentiment, outlook] = await Promise.all([
      aiText(`${coin.name} $${coin.current_price?.toLocaleString()}, ${coin.price_change_percentage_24h?.toFixed(2)}% 기술적분석 400~500자. RSI,이동평균,지지저항 포함.`, sys),
      aiText(`${coin.name} 온체인지표 300~400자. 거래량,주요지갑,네트워크활동.`, sys),
      aiText(`${coin.name} 시장심리 200~300자. 기관투자자,소셜,공포탐욕.`, sys),
      aiText(`${coin.name} 단기~중기 전망 200~300자. 모니터링포인트,위험요소.`, sys),
    ])

    saveJson(outputFile, {
      slug, coinId: coin.id, coinName: coin.name, coinSymbol: coin.symbol?.toUpperCase(),
      weekNumber: week, year: now.getFullYear(), generatedAt: now.toISOString(),
      title: `${coin.name} 주간 심층 분석 - ${now.getFullYear()}년 ${week}주차`,
      priceData: { current: coin.current_price, weekChange: coin.price_change_percentage_24h, marketCap: coin.market_cap },
      technicalAnalysis: technical, onchainMetrics: onchain, marketSentiment: sentiment, outlook,
      relatedNews: [], seoKeywords: [`${coin.name} 주간 분석`, `${coin.symbol?.toUpperCase()} 전망`],
    })
  }
}

// ─── 3. 트렌딩 토픽 생성 (매주 3개 순환) ─────────────────────
const ALL_TOPICS = [
  { slug: 'bitcoin-etf', keyword: 'Bitcoin ETF', keywordKo: '비트코인 ETF' },
  { slug: 'ethereum-staking', keyword: 'Ethereum Staking', keywordKo: '이더리움 스테이킹' },
  { slug: 'defi-protocol', keyword: 'DeFi Protocol', keywordKo: '디파이 프로토콜' },
  { slug: 'crypto-regulation', keyword: 'Crypto Regulation', keywordKo: '암호화폐 규제' },
  { slug: 'bitcoin-halving', keyword: 'Bitcoin Halving', keywordKo: '비트코인 반감기' },
  { slug: 'altcoin-season', keyword: 'Altcoin Season', keywordKo: '알트코인 시즌' },
  { slug: 'crypto-ai', keyword: 'AI Crypto', keywordKo: 'AI 암호화폐' },
  { slug: 'layer2-scaling', keyword: 'Layer 2', keywordKo: '레이어2 확장성' },
]

async function generateTopics() {
  const sys = `암호화폐 전문 저널리스트. 한국어 흥미롭고 정보있게. 마크다운 없이.`
  // 오래된 토픽(30일 이상) 갱신 — API와 동일 TTL
  const TOPIC_TTL = 30 * 24 * 60 * 60 * 1000
  for (const topic of ALL_TOPICS) {
    const outputFile = path.join(DIRS.topics, `${topic.slug}.json`)
    if (fs.existsSync(outputFile)) {
      const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))
      const age = Date.now() - new Date(existing.generatedAt).getTime()
      if (age < TOPIC_TTL) {
        console.log(`  ⏭️  토픽 유효 (${Math.round(age / 86400000)}일 경과): ${topic.slug}`)
        continue
      }
    }
    console.log(`\n🔥 토픽 생성: ${topic.keywordKo}`)

    const [intro, main, conclusion] = await Promise.all([
      aiText(`${topic.keywordKo}(${topic.keyword}) 기사 도입부 200~250자.`, sys),
      aiText(`${topic.keywordKo}(${topic.keyword}) 심층분석 본문 500~700자. 현황,주요플레이어,시장영향.`, sys),
      aiText(`${topic.keywordKo}(${topic.keyword}) 향후전망 150~200자.`, sys),
    ])

    const existing = fs.existsSync(outputFile) ? JSON.parse(fs.readFileSync(outputFile, 'utf-8')) : null
    saveJson(outputFile, {
      slug: topic.slug, keyword: topic.keyword, keywordKo: topic.keywordKo,
      generatedAt: new Date().toISOString(),
      title: `${topic.keywordKo} 완전 분석 가이드: 최신 동향과 전망`,
      introduction: intro, mainContent: main, conclusion,
      relatedNews: [], relatedCoins: [],
      seoKeywords: [topic.keywordKo, `${topic.keywordKo}란`, `${topic.keywordKo} 투자`],
      updateCount: (existing?.updateCount ?? 0) + 1,
    })
  }
}

// ─── 4. 용어 사전 생성 (매주 5개씩) ──────────────────────────
const ALL_TERMS = [
  { slug: 'defi', term: 'DeFi', termKo: '디파이', category: 'defi' },
  { slug: 'staking', term: 'Staking', termKo: '스테이킹', category: 'defi' },
  { slug: 'yield-farming', term: 'Yield Farming', termKo: '이자 파밍', category: 'defi' },
  { slug: 'smart-contract', term: 'Smart Contract', termKo: '스마트 컨트랙트', category: 'technical' },
  { slug: 'blockchain', term: 'Blockchain', termKo: '블록체인', category: 'basic' },
  { slug: 'halving', term: 'Halving', termKo: '반감기', category: 'basic' },
  { slug: 'market-cap', term: 'Market Cap', termKo: '시가총액', category: 'trading' },
  { slug: 'whale', term: 'Whale', termKo: '고래', category: 'trading' },
  { slug: 'bull-market', term: 'Bull Market', termKo: '강세장', category: 'trading' },
  { slug: 'bear-market', term: 'Bear Market', termKo: '약세장', category: 'trading' },
  { slug: 'altcoin', term: 'Altcoin', termKo: '알트코인', category: 'basic' },
  { slug: 'dao', term: 'DAO', termKo: '다오', category: 'defi' },
  { slug: 'nft', term: 'NFT', termKo: 'NFT', category: 'basic' },
  { slug: 'layer2', term: 'Layer 2', termKo: '레이어2', category: 'technical' },
  { slug: 'gas-fee', term: 'Gas Fee', termKo: '가스비', category: 'technical' },
  { slug: 'dex', term: 'DEX', termKo: '탈중앙화 거래소', category: 'defi' },
  { slug: 'cold-wallet', term: 'Cold Wallet', termKo: '콜드 월렛', category: 'basic' },
  { slug: 'airdrop', term: 'Airdrop', termKo: '에어드롭', category: 'basic' },
  { slug: 'rsi', term: 'RSI', termKo: 'RSI 지표', category: 'trading' },
  { slug: 'liquidity-pool', term: 'Liquidity Pool', termKo: '유동성 풀', category: 'defi' },
]

async function generateGlossary() {
  const sys = `암호화폐 교육 전문가. 초보자도 쉽게 이해. 한국어 친절하게. 마크다운 없이.`
  // 6개월(180일) 미만이면 재생성 생략 — API와 동일 TTL
  const GLOSSARY_TTL = 180 * 24 * 60 * 60 * 1000
  let count = 0
  for (const t of ALL_TERMS) {
    if (count >= 5) break
    const outputFile = path.join(DIRS.glossary, `${t.slug}.json`)
    if (fs.existsSync(outputFile)) {
      const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))
      const age = Date.now() - new Date(existing.generatedAt).getTime()
      if (age < GLOSSARY_TTL) {
        console.log(`  ⏭️  용어 유효 (${Math.round(age / 86400000)}일 경과): ${t.slug}`)
        continue
      }
    }
    console.log(`\n📖 용어 생성: ${t.termKo}`)
    count++

    const [shortDef, fullExp, howItWorks, examplesRaw] = await Promise.all([
      aiText(`${t.termKo}(${t.term}) 한 줄 정의 50~80자.`, sys),
      aiText(`${t.termKo}(${t.term}) 상세설명 400~600자. 개념,등장배경,특징,장단점.`, sys),
      aiText(`${t.termKo}(${t.term}) 작동원리 300~400자. 쉬운언어.`, sys),
      aiText(`${t.termKo}(${t.term}) 실사용 예시 3가지. 형식: 1. ... 2. ... 3. ...`, sys),
    ])

    const examples = examplesRaw.split('\n').filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).slice(0, 3)

    saveJson(outputFile, {
      slug: t.slug, term: t.term, termKo: t.termKo, category: t.category,
      generatedAt: new Date().toISOString(), shortDefinition: shortDef,
      fullExplanation: fullExp, howItWorks,
      examples: examples.length > 0 ? examples : [examplesRaw.slice(0, 100)],
      relatedTerms: [], relatedCoins: [],
      seoKeywords: [`${t.termKo}란`, `${t.termKo} 뜻`, `암호화폐 ${t.termKo}`],
    })
  }
}

// ─── 5. 플래시 브리핑 생성 ────────────────────────────────────
async function generateFlashBrief(date: string) {
  const id = `${date}-morning`
  const outputFile = path.join(DIRS.brief, `${id}.json`)
  if (fs.existsSync(outputFile)) {
    console.log(`  ⏭️  브리핑 이미 존재: ${id}`)
    return
  }
  console.log(`\n⚡ 플래시 브리핑 생성: ${id}`)

  const [coins, fg, news, global] = await Promise.all([
    fetchCoins(), fetchFearGreed(), fetchNews(5), fetchGlobal()
  ])
  const btc = coins.find((c: any) => c.id === 'bitcoin')
  const headlines = news.map((n: any) => `- ${n.title}`).join('\n')

  const bulletsRaw = await aiText(
    `${date} 오전 코인 브리핑 5가지:
    BTC: $${btc?.current_price?.toLocaleString()} (${btc?.price_change_percentage_24h?.toFixed(2)}%)
    공포탐욕: ${fg.value} (${fg.label})
    뉴스:\n${headlines}
    형식: 1. ... 2. ... 3. ... 4. ... 5. ...`,
    `암호화폐 전문가. 간결하게 한국어. 마크다운 없이.`
  )

  const bullets = bulletsRaw.split('\n').filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).slice(0, 5)
  const emoji = fg.value >= 75 ? '🔥' : fg.value >= 55 ? '🚀' : fg.value >= 45 ? '📊' : fg.value >= 25 ? '😰' : '💀'

  saveJson(outputFile, {
    id, date, session: 'morning', generatedAt: new Date().toISOString(),
    title: `${date} 오전 코인 브리핑 ${emoji}`,
    bullets: bullets.length > 0 ? bullets : ['시장 분석 중...'],
    marketSnapshot: {
      btcPrice: btc?.current_price ?? 0,
      btcChange: btc?.price_change_percentage_24h ?? 0,
      totalMarketCap: global?.total_market_cap?.usd ?? 0,
      fearGreedIndex: fg.value,
    },
    emoji,
  })
}

// ─── 메인 실행 ───────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  const results: Record<string, 'success' | 'error'> = {}

  if (types.includes('daily')) {
    try { await generateDailyReport(targetDate); results.daily = 'success' }
    catch (e) { console.error('❌ 일일 리포트 실패:', e); results.daily = 'error' }
  }

  if (types.includes('brief')) {
    try { await generateFlashBrief(targetDate); results.brief = 'success' }
    catch (e) { console.error('❌ 브리핑 실패:', e); results.brief = 'error' }
  }

  if (types.includes('coins')) {
    try { await generateCoinAnalyses(); results.coins = 'success' }
    catch (e) { console.error('❌ 코인 분석 실패:', e); results.coins = 'error' }
  }

  if (types.includes('topics')) {
    try { await generateTopics(); results.topics = 'success' }
    catch (e) { console.error('❌ 토픽 실패:', e); results.topics = 'error' }
  }

  if (types.includes('glossary')) {
    try { await generateGlossary(); results.glossary = 'success' }
    catch (e) { console.error('❌ 용어사전 실패:', e); results.glossary = 'error' }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== ✅ 완료 (${elapsed}초) ===`)
  Object.entries(results).forEach(([k, v]) =>
    console.log(`  ${v === 'success' ? '✅' : '❌'} ${k}`)
  )
  console.log('======================\n')
}

main().catch((e) => { console.error('Fatal error:', e); process.exit(1) })
