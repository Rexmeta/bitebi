'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'

interface TopicInfo {
  slug:        string
  keyword:     string
  keywordKo:   string
  generated:   boolean
  expired:     boolean
  generatedAt: string | null
  expiresAt:   string | null
}

const TOPIC_ICONS: Record<string, string> = {
  'bitcoin-etf':      '🏦',
  'ethereum-staking': '⟠',
  'defi-protocol':    '💎',
  'crypto-regulation':'⚖️',
  'bitcoin-halving':  '₿',
  'nft-market':       '🖼️',
  'altcoin-season':   '🚀',
  'web3-gaming':      '🎮',
  'crypto-ai':        '🤖',
  'layer2-scaling':   '⚡',
}

/** 남은 유효 기간 (짧게) */
function shortRemaining(expiresAtIso: string): string {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now()
  if (diffMs <= 0) return '만료'
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays}일`
  const months = Math.floor(diffDays / 30)
  return `${months}개월`
}

/** 생성된 지 얼마나 됐는지 (짧게) */
function shortAgo(generatedAtIso: string): string {
  const diffMs   = Date.now() - new Date(generatedAtIso).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '오늘'
  if (diffDays < 30)  return `${diffDays}일 전`
  const months = Math.floor(diffDays / 30)
  return `${months}개월 전`
}

export default function TopicListPage() {
  const [topics,  setTopics]  = useState<TopicInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/topic')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTopics(json.topics)
      })
      .finally(() => setLoading(false))
  }, [])

  const generatedCount = topics.filter((t) => t.generated).length
  const totalCount     = topics.length

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.LEADERBOARD_TOP} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">
            🔥 암호화폐 핫 토픽
          </h1>
          <p className="text-gray-400 mb-3">
            AI가 분석하는 암호화폐 주요 이슈와 트렌드
          </p>
          {/* 생성 현황 요약 */}
          {!loading && (
            <div className="flex gap-3 text-sm flex-wrap">
              <span className="bg-green-500/15 text-green-400 px-3 py-1 rounded-full">
                ✓ 저장완료 {generatedCount}/{totalCount}
              </span>
              <span className="bg-gray-700 text-gray-400 px-3 py-1 rounded-full">
                ⏱ 갱신 주기: 30일
              </span>
            </div>
          )}
        </div>

        {/* 토픽 그리드 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-5 animate-pulse">
                <div className="h-6 bg-gray-700 rounded mb-2" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/topic/${t.slug}`}
                className="group bg-gray-800 hover:bg-gray-700 rounded-xl p-5 transition-all border border-gray-700 hover:border-yellow-400/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{TOPIC_ICONS[t.slug] ?? '📊'}</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {t.generated && (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                        ✓ 저장됨
                      </span>
                    )}
                    {t.expired && (
                      <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
                        갱신 필요
                      </span>
                    )}
                    {!t.generated && !t.expired && (
                      <span className="bg-gray-600/50 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                        미생성
                      </span>
                    )}
                  </div>
                </div>
                <h2 className="text-white font-bold text-lg group-hover:text-yellow-400 transition-colors">
                  {t.keywordKo}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{t.keyword}</p>

                {/* 생성 정보 */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-yellow-400 text-sm group-hover:underline">
                    자세히 보기 →
                  </span>
                  {t.generatedAt && (
                    <span className="text-gray-500 text-xs">
                      {shortAgo(t.generatedAt)} 생성
                      {t.expiresAt && ` · ${shortRemaining(t.expiresAt)} 남음`}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 광고 */}
        <AdBanner slot={AD_SLOTS.FOOTER_BANNER} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 관련 페이지 */}
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold mb-3">📚 관련 콘텐츠</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/daily-report', label: '일일 리포트' },
              { href: '/glossary',     label: '용어 사전'  },
              { href: '/news',         label: '뉴스'       },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
