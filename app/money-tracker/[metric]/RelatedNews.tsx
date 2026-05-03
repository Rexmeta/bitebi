'use client'
import React, { useEffect, useState } from 'react'

interface Article {
  title: string
  link: string
  source: string
  pubDate?: string
  contentSnippet?: string
}

const KEYWORDS_BY_METRIC: Record<string, string[]> = {
  'global-liquidity': ['M2', '유동성', '연준', 'fed', 'liquidity'],
  'stablecoin-supply': ['스테이블', 'stablecoin', 'usdt', 'usdc', 'tether', 'circle'],
  'exchange-netflow': ['거래소', 'netflow', 'exchange', '바이낸스', 'binance', 'coinbase'],
  'derivatives': ['선물', '파생', '청산', 'liquidation', 'funding', 'futures', 'open interest'],
  'etf-flows': ['etf', '비트코인 etf', '이더리움 etf', 'spot etf', 'blackrock', 'fidelity'],
  'onchain-cohorts': ['mvrv', 'sopr', '온체인', 'onchain', 'realized', 'long-term'],
  'kimchi-premium': ['김치', '김치프리미엄', '업비트', 'upbit', '빗썸', 'bithumb', 'krw'],
  'fear-greed': ['공포', '탐욕', 'fear', 'greed', '시장심리'],
}

export default function RelatedNews({ metricId }: { metricId: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch('/api/aggregate-news')
        const j = await r.json()
        const all: Article[] = j?.articles || j?.data || []
        const kws = (KEYWORDS_BY_METRIC[metricId] || []).map(k => k.toLowerCase())
        const matches = all.filter(a => {
          const hay = `${a.title || ''} ${a.contentSnippet || ''}`.toLowerCase()
          return kws.some(k => hay.includes(k))
        }).slice(0, 6)
        if (!cancelled) setArticles(matches)
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [metricId])

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
      <h2 className="text-sm font-bold text-white mb-3">📰 관련 뉴스</h2>
      {loading ? (
        <p className="text-xs text-gray-500">관련 뉴스 로딩 중…</p>
      ) : articles.length === 0 ? (
        <p className="text-xs text-gray-500">이 지표와 직접 매칭되는 최근 뉴스가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {articles.map(a => (
            <li key={a.link} className="border-b border-[#21262d]/50 pb-2 last:border-0">
              <a href={a.link} target="_blank" rel="noreferrer" className="text-sm text-gray-100 hover:text-blue-300 line-clamp-2">
                {a.title}
              </a>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {a.source}{a.pubDate ? ` · ${new Date(a.pubDate).toLocaleDateString('ko-KR')}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
