'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'
import type { DailyReport } from '@/app/types/content'

function formatNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export default function DailyReportPage() {
  const { date } = useParams<{ date: string }>()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!date) return
    setLoading(true)
    fetch(`/api/daily-report?date=${date}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setReport(json.data)
        else setError(json.error ?? '데이터를 불러오지 못했습니다.')
      })
      .catch(() => setError('네트워크 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [date])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">AI가 시장 분석 리포트를 작성 중입니다...</p>
          <p className="text-gray-500 text-sm mt-1">최초 생성 시 30~60초 소요될 수 있습니다</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '리포트를 불러올 수 없습니다.'}</p>
          <Link href="/daily-report" className="text-yellow-400 hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const fg = report.marketOverview.fearGreedIndex
  const fgColor = fg >= 75 ? 'text-green-400' : fg >= 55 ? 'text-yellow-400' : fg >= 45 ? 'text-orange-400' : 'text-red-400'
  const fgEmoji = fg >= 75 ? '🔥' : fg >= 55 ? '🚀' : fg >= 45 ? '😐' : fg >= 25 ? '😰' : '💀'

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.LEADERBOARD_TOP} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <Link href="/" className="hover:text-yellow-400">홈</Link>
            <span>›</span>
            <Link href="/daily-report" className="hover:text-yellow-400">일일 리포트</Link>
            <span>›</span>
            <span>{date}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-3">{report.title}</h1>
          <p className="text-gray-300 text-lg leading-relaxed">{report.summary}</p>
          <p className="text-gray-500 text-sm mt-2">
            생성 시각: {new Date(report.generatedAt).toLocaleString('ko-KR')} · AI 자동 생성
          </p>
        </div>

        {/* 시장 개요 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">전체 시가총액</p>
            <p className="text-white font-bold">{formatNumber(report.marketOverview.totalMarketCap)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">BTC 도미넌스</p>
            <p className="text-yellow-400 font-bold">{report.marketOverview.btcDominance?.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">공포탐욕지수</p>
            <p className={`font-bold ${fgColor}`}>{fgEmoji} {report.marketOverview.fearGreedIndex}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">시장 심리</p>
            <p className={`font-bold text-sm ${fgColor}`}>{report.marketOverview.fearGreedLabel}</p>
          </div>
        </div>

        {/* 오늘의 주요 이슈 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-yellow-400 mb-4">📌 오늘의 핵심 이슈</h2>
          <ul className="space-y-3">
            {report.keyEvents.map((event, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold shrink-0">{i + 1}.</span>
                <span className="text-gray-200">{event}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 인아티클 광고 */}
        <AdBanner slot={AD_SLOTS.IN_ARTICLE} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* BTC 분석 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-orange-400 mb-4">₿ 비트코인 분석</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{report.btcAnalysis}</p>
        </div>

        {/* 상승/하락 코인 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-green-400 font-bold mb-3">🚀 상승 TOP 3</h3>
            {report.marketOverview.topGainers.map((coin) => (
              <div key={coin.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <span className="text-white font-medium">{coin.symbol}</span>
                <span className="text-green-400 font-bold">+{coin.change24h?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-red-400 font-bold mb-3">📉 하락 TOP 3</h3>
            {report.marketOverview.topLosers.map((coin) => (
              <div key={coin.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <span className="text-white font-medium">{coin.symbol}</span>
                <span className="text-red-400 font-bold">{coin.change24h?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ETH 분석 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-blue-400 mb-4">⟠ 이더리움 분석</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{report.ethAnalysis}</p>
        </div>

        {/* 인아티클 광고 2 */}
        <AdBanner slot={AD_SLOTS.IN_ARTICLE} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 시장 전망 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 mb-6 border border-yellow-400/20">
          <h2 className="text-lg font-bold text-yellow-400 mb-4">🔮 향후 시장 전망</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{report.marketOutlook}</p>
        </div>

        {/* 관련 뉴스 */}
        {report.relatedNews.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">📰 관련 뉴스</h2>
            <div className="space-y-3">
              {report.relatedNews.map((news, i) => (
                <a
                  key={i}
                  href={news.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <p className="text-white font-medium text-sm mb-1">{news.title}</p>
                  <p className="text-gray-400 text-xs">{news.source} · {news.pubDate ? new Date(news.pubDate).toLocaleDateString('ko-KR') : ''}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Multiplex 광고 */}
        <AdBanner slot={AD_SLOTS.MULTIPLEX} format="autorelaxed" style={{ minHeight: '300px' }} className="mb-6" />

        {/* 날짜 네비게이션 */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
          <Link
            href={`/daily-report/${new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0]}`}
            className="text-yellow-400 hover:underline text-sm"
          >
            ← 전일 리포트
          </Link>
          <Link href="/daily-report" className="text-gray-400 hover:text-white text-sm">
            전체 목록
          </Link>
          <Link
            href={`/daily-report/${new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]}`}
            className="text-yellow-400 hover:underline text-sm"
          >
            다음 리포트 →
          </Link>
        </div>

        {/* SEO 키워드 태그 */}
        <div className="mt-6 flex flex-wrap gap-2">
          {report.seoKeywords.map((kw) => (
            <span key={kw} className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
              #{kw}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
