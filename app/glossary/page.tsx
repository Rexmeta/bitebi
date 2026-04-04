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
}

const CATEGORY_LABEL: Record<string, string> = {
  basic: '🎓 기초',
  defi: '🏦 DeFi',
  trading: '📈 거래',
  technical: '⚙️ 기술',
  regulation: '⚖️ 규제',
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.ATF_LEADERBOARD} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">
            📚 암호화폐 용어 사전
          </h1>
          <p className="text-gray-400">
            AI가 설명하는 암호화폐 핵심 용어 {terms.length}개 · 초보자도 쉽게 이해
          </p>
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
                className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors border border-gray-700 hover:border-yellow-400/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-bold">{t.termKo}</p>
                  {t.generated && (
                    <span className="text-green-400 text-xs">✓</span>
                  )}
                </div>
                <p className="text-gray-400 text-xs">{t.term}</p>
                <span className="mt-2 inline-block text-xs text-yellow-400">
                  {CATEGORY_LABEL[t.category] ?? t.category}
                </span>
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
