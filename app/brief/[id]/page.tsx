'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'
import type { FlashBrief } from '@/app/types/content'

function formatPrice(n: number): string {
  if (!n) return '$0'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  return `$${n.toLocaleString()}`
}

export default function FlashBriefPage() {
  const { id } = useParams<{ id: string }>()
  const [brief, setBrief] = useState<FlashBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const [date, session] = id.split(/-(?=morning|afternoon)/)
    setLoading(true)
    fetch(`/api/flash-brief?date=${date}&session=${session}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBrief(json.data)
        else setError(json.error ?? '데이터를 불러오지 못했습니다.')
      })
      .catch(() => setError('네트워크 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">브리핑을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '브리핑을 찾을 수 없습니다.'}</p>
          <Link href="/" className="text-yellow-400 hover:underline">홈으로</Link>
        </div>
      </div>
    )
  }

  const changeColor = brief.marketSnapshot.btcChange >= 0 ? 'text-green-400' : 'text-red-400'
  const changeSign = brief.marketSnapshot.btcChange >= 0 ? '+' : ''

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.LEADERBOARD_TOP} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">{brief.emoji}</div>
          <h1 className="text-2xl font-bold text-white">{brief.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {brief.session === 'morning' ? '🌅 오전 브리핑' : '🌆 오후 브리핑'} ·{' '}
            {new Date(brief.generatedAt).toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 시장 스냅샷 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">BTC 가격</p>
            <p className="text-white font-bold text-lg">{formatPrice(brief.marketSnapshot.btcPrice)}</p>
            <p className={`text-sm font-medium ${changeColor}`}>
              {changeSign}{brief.marketSnapshot.btcChange.toFixed(2)}%
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">공포탐욕지수</p>
            <p className="text-yellow-400 font-bold text-lg">{brief.marketSnapshot.fearGreedIndex}</p>
            <p className="text-gray-400 text-sm">시장 심리</p>
          </div>
        </div>

        {/* 핵심 브리핑 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-yellow-400 font-bold text-lg mb-4">⚡ 오늘의 핵심</h2>
          <ul className="space-y-4">
            {brief.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="bg-yellow-500/20 text-yellow-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-200 leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 인아티클 광고 */}
        <AdBanner slot={AD_SLOTS.IN_ARTICLE} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 시가총액 */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-1">전체 암호화폐 시가총액</p>
          <p className="text-white font-bold text-xl">{formatMarketCap(brief.marketSnapshot.totalMarketCap)}</p>
        </div>

        {/* 네비게이션 */}
        <div className="flex gap-3 mb-6">
          <Link
            href={`/daily-report/${brief.date}`}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-center transition-colors"
          >
            상세 리포트 보기 →
          </Link>
          <Link
            href="/news"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl text-center transition-colors"
          >
            최신 뉴스
          </Link>
        </div>

        {/* Multiplex */}
        <AdBanner slot={AD_SLOTS.MULTIPLEX} format="autorelaxed" style={{ minHeight: '300px' }} />

      </div>
    </div>
  )
}
