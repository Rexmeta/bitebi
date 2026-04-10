'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'

interface TermInfo {
  slug: string
  term: string
  termKo: string
  category: string
  generated: boolean
  expired: boolean
  generatedAt: string | null
  expiresAt: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  basic: '🎓 기초',
  defi: '🏦 DeFi',
  trading: '📈 거래',
  technical: '⚙️ 기술',
  regulation: '⚖️ 규제',
}

/** 남은 캐시 유효 기간 (짧게) */
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
  const diffMs = Date.now() - new Date(generatedAtIso).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '오늘'
  if (diffDays < 30) return `${diffDays}일 전`
  const months = Math.floor(diffDays / 30)
  return `${months}개월 전`
}

export default function GlossaryPage() {
  const [terms, setTerms] = useState<TermInfo[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/glossary')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTerms(json.terms)
      })
      .finally(() => setLoading(false))
  }, [])

  const categories = ['all', 'basic', 'defi', 'trading', 'technical']

  const filtered = terms.filter((t) => {
    const matchCat = filter === 'all' || t.category === filter
    const matchSearch =
      !search ||
      t.termKo.toLowerCase().includes(search.toLowerCase()) ||
      t.term.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // 통계
  const generatedCount = terms.filter((t) => t.generated && !t.expired).length
  const expiredCount = terms.filter((t) => t.expired).length
  const totalCount = terms.length

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.LEADERBOARD_TOP} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">
            📚 암호화폐 용어 사전
          </h1>
          <p className="text-gray-400 mb-3">
            AI가 설명하는 암호화폐 핵심 용어 {totalCount}개 · 초보자도 쉽게 이해
          </p>
          {/* 캐시 현황 요약 */}
          {!loading && (
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="bg-green-500/15 text-green-400 px-3 py-1.5 rounded-full">
                ✓ 저장됨 {generatedCount}개
              </span>
              {expiredCount > 0 && (
                <span className="bg-orange-500/15 text-orange-400 px-3 py-1.5 rounded-full">
                  ⟳ 갱신 예정 {expiredCount}개
                </span>
              )}
              <span className="bg-gray-700 text-gray-400 px-3 py-1.5 rounded-full">
                미생성 {totalCount - generatedCount - expiredCount}개
              </span>
              <span className="bg-gray-700/50 text-gray-500 px-3 py-1.5 rounded-full">
                🗓 저장 후 6개월간 유지
              </span>
            </div>
          )}
        </div>

        {/* 검색 */}
        <input
          type="text"
          placeholder="용어 검색... (예: 디파이, staking)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 mb-4 focus:border-yellow-400 focus:outline-none"
        />

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === cat
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat === 'all' ? '전체' : CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        {/* 용어 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-gray-700 rounded mb-2" />
                <div className="h-3 bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {filtered.map((t) => (
              <Link
                key={t.slug}
                href={`/glossary/${t.slug}`}
                className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors border border-gray-700 hover:border-yellow-400/50 flex flex-col"
              >
                {/* 상단: 용어명 + 상태 배지 */}
                <div className="flex items-start justify-between mb-1 gap-1">
                  <p className="text-white font-bold leading-tight">{t.termKo}</p>
                  {t.generated && !t.expired && (
                    <span className="text-green-400 text-xs shrink-0 mt-0.5" title="저장된 콘텐츠">✓</span>
                  )}
                  {t.expired && (
                    <span className="text-orange-400 text-xs shrink-0 mt-0.5" title="갱신 예정">⟳</span>
                  )}
                </div>

                <p className="text-gray-400 text-xs mb-2">{t.term}</p>

                <div className="mt-auto flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-xs text-yellow-400">
                    {CATEGORY_LABEL[t.category] ?? t.category}
                  </span>

                  {/* 생성일 / 만료 잔여 */}
                  {t.generated && t.generatedAt && t.expiresAt && !t.expired && (
                    <span
                      className="text-xs text-gray-600"
                      title={`생성: ${new Date(t.generatedAt).toLocaleDateString('ko-KR')} | 만료까지: ${shortRemaining(t.expiresAt)}`}
                    >
                      {shortAgo(t.generatedAt)} · {shortRemaining(t.expiresAt)} 남음
                    </span>
                  )}
                  {t.expired && t.generatedAt && (
                    <span className="text-xs text-orange-500/80" title="6개월 경과, 다음 클릭 시 재생성">
                      갱신 예정
                    </span>
                  )}
                  {!t.generated && (
                    <span className="text-xs text-gray-600">클릭 시 생성</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 중간 광고 */}
        <AdBanner slot={AD_SLOTS.FOOTER_BANNER} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 관련 링크 */}
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold mb-3">더 알아보기</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/daily-report', label: '일일 리포트' },
              { href: '/topic', label: '트렌딩 토픽' },
              { href: '/news', label: '최신 뉴스' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
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
