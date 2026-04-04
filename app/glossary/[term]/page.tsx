'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'
import type { GlossaryTerm } from '@/app/types/content'

const CATEGORY_LABEL: Record<string, string> = {
  basic: '기초 개념',
  defi: 'DeFi',
  trading: '거래/투자',
  technical: '기술',
  regulation: '규제/법률',
}

export default function GlossaryTermPage() {
  const { term: slug } = useParams<{ term: string }>()
  const [data, setData] = useState<GlossaryTerm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/glossary?slug=${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data)
        else setError(json.error ?? '데이터를 불러오지 못했습니다.')
      })
      .catch(() => setError('네트워크 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">AI가 용어를 설명하는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '용어를 찾을 수 없습니다.'}</p>
          <Link href="/glossary" className="text-yellow-400 hover:underline">용어 사전으로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.ATF_LEADERBOARD} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        {/* 브레드크럼 */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-yellow-400">홈</Link>
          <span>›</span>
          <Link href="/glossary" className="hover:text-yellow-400">용어 사전</Link>
          <span>›</span>
          <span className="text-white">{data.termKo}</span>
        </div>

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full">
              {CATEGORY_LABEL[data.category] ?? data.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {data.termKo}
            <span className="text-gray-400 text-xl ml-3">({data.term})</span>
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed bg-gray-800 rounded-xl p-4 mt-3">
            💡 {data.shortDefinition}
          </p>
        </div>

        {/* 상세 설명 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-yellow-400 mb-4">📖 상세 설명</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{data.fullExplanation}</p>
        </div>

        {/* 인아티클 광고 */}
        <AdBanner slot={AD_SLOTS.IN_ARTICLE} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 작동 원리 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-blue-400 mb-4">⚙️ 어떻게 작동하나요?</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{data.howItWorks}</p>
        </div>

        {/* 실제 예시 */}
        {data.examples.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-green-400 mb-4">✅ 실제 사용 예시</h2>
            <ul className="space-y-3">
              {data.examples.map((ex, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="bg-green-500/20 text-green-400 w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-300">{ex}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Multiplex 광고 */}
        <AdBanner slot={AD_SLOTS.MULTIPLEX} format="autorelaxed" style={{ minHeight: '300px' }} className="mb-6" />

        {/* SEO 키워드 */}
        <div className="flex flex-wrap gap-2 mt-4 mb-8">
          {data.seoKeywords.map((kw) => (
            <span key={kw} className="bg-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full">
              #{kw}
            </span>
          ))}
        </div>

        <p className="text-gray-500 text-xs text-center">
          AI 자동 생성 · 마지막 업데이트: {new Date(data.generatedAt).toLocaleDateString('ko-KR')}
        </p>

      </div>
    </div>
  )
}
