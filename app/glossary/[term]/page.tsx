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

/** 날짜를 "N일 전" 또는 "N개월 전" 형식으로 변환 */
function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '오늘'
  if (diffDays < 30) return `${diffDays}일 전`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}개월 전`
}

/** 남은 캐시 유효 기간을 "N개월 N일 남음" 형식으로 변환 */
function remainingTime(expiresAtIso: string): string {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now()
  if (diffMs <= 0) return '만료됨'
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays}일 남음`
  const months = Math.floor(diffDays / 30)
  const days = diffDays % 30
  return days > 0 ? `${months}개월 ${days}일 남음` : `${months}개월 남음`
}

export default function GlossaryTermPage() {
  const { term: slug } = useParams<{ term: string }>()
  const [data, setData] = useState<GlossaryTerm | null>(null)
  const [source, setSource] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setData(null)
    setError('')
    fetch(`/api/glossary?slug=${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data)
          setSource(json.source ?? '')
          setExpiresAt(json.expiresAt ?? '')
        } else {
          setError(json.error ?? '데이터를 불러오지 못했습니다.')
        }
      })
      .catch(() => setError('네트워크 오류가 발생했습니다.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 font-medium mb-1">AI가 용어를 설명하는 중...</p>
          <p className="text-gray-500 text-sm">처음 생성 시 10~15초 소요됩니다</p>
          <p className="text-gray-600 text-xs mt-2">생성 후 6개월간 재사용됩니다</p>
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

  const isCached = source === 'cache' || source === 'stale-cache'

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.LEADERBOARD_TOP} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

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
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full">
              {CATEGORY_LABEL[data.category] ?? data.category}
            </span>
            {/* 캐시 여부 배지 */}
            {isCached ? (
              <span className="bg-green-500/15 text-green-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                ✓ 저장된 콘텐츠
              </span>
            ) : (
              <span className="bg-blue-500/15 text-blue-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                ✨ 새로 생성됨
              </span>
            )}
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
        <div className="flex flex-wrap gap-2 mt-4 mb-6">
          {data.seoKeywords.map((kw) => (
            <span key={kw} className="bg-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full">
              #{kw}
            </span>
          ))}
        </div>

        {/* 생성 정보 */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>
              🤖 AI 자동 생성 · {relativeTime(data.generatedAt)} 생성
              ({new Date(data.generatedAt).toLocaleDateString('ko-KR')})
            </span>
            {expiresAt && (
              <span className="text-gray-600">
                🗓 갱신까지 {remainingTime(expiresAt)}
              </span>
            )}
          </div>
          <p className="text-gray-600">
            이 콘텐츠는 생성 후 6개월간 그대로 유지됩니다. 만료 후 자동으로 최신 내용으로 업데이트됩니다.
          </p>
        </div>

      </div>
    </div>
  )
}
