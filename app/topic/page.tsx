'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'

interface TopicInfo {
  slug: string
  keyword: string
  keywordKo: string
  generated: boolean
}

const TOPIC_ICONS: Record<string, string> = {
  'bitcoin-etf': '🏦',
  'ethereum-staking': '⟠',
  'defi-protocol': '💎',
  'crypto-regulation': '⚖️',
  'bitcoin-halving': '₿',
  'nft-market': '🖼️',
  'altcoin-season': '🚀',
  'web3-gaming': '🎮',
  'crypto-ai': '🤖',
  'layer2-scaling': '⚡',
}

export default function TopicListPage() {
  const [topics, setTopics] = useState<TopicInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/topic')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTopics(json.topics)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.ATF_LEADERBOARD} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">
            🔥 암호화폐 핫 토픽
          </h1>
          <p className="text-gray-400">
            AI가 분석하는 암호화폐 주요 이슈와 트렌드
          </p>
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
                  {t.generated && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                      분석완료
                    </span>
                  )}
                </div>
                <h2 className="text-white font-bold text-lg group-hover:text-yellow-400 transition-colors">
                  {t.keywordKo}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{t.keyword}</p>
                <div className="mt-3 text-yellow-400 text-sm">
                  자세히 보기 →
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
              { href: '/glossary', label: '용어 사전' },
              { href: '/news', label: '뉴스' },
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
