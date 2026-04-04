'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'
import type { TopicArticle } from '@/app/types/content'

export default function TopicArticlePage() {
  const { keyword: slug } = useParams<{ keyword: string }>()
  const [article, setArticle] = useState<TopicArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/topic?slug=${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setArticle(json.data)
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
          <p className="text-gray-400">AI가 기사를 작성하는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '기사를 불러올 수 없습니다.'}</p>
          <Link href="/topic" className="text-yellow-400 hover:underline">토픽 목록으로</Link>
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
          <Link href="/topic" className="hover:text-yellow-400">토픽</Link>
          <span>›</span>
          <span className="text-white">{article.keywordKo}</span>
        </div>

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full">
              {article.keyword}
            </span>
            <span className="text-gray-500 text-xs">
              업데이트 {article.updateCount}회 · {new Date(article.generatedAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{article.title}</h1>
        </div>

        {/* 도입부 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border-l-4 border-yellow-400">
          <p className="text-gray-200 text-lg leading-relaxed">{article.introduction}</p>
        </div>

        {/* 인아티클 광고 */}
        <AdBanner slot={AD_SLOTS.IN_ARTICLE} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 본문 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-base">{article.mainContent}</p>
        </div>

        {/* 결론 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 mb-6 border border-yellow-400/20">
          <h2 className="text-yellow-400 font-bold mb-3">🎯 핵심 포인트</h2>
          <p className="text-gray-300 leading-relaxed">{article.conclusion}</p>
        </div>

        {/* 관련 뉴스 */}
        {article.relatedNews.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-white font-bold mb-4">📰 관련 최신 뉴스</h2>
            <div className="space-y-3">
              {article.relatedNews.map((news, i) => (
                <a
                  key={i}
                  href={news.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <p className="text-white text-sm font-medium mb-1">{news.title}</p>
                  <p className="text-gray-400 text-xs">{news.source}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Multiplex 광고 */}
        <AdBanner slot={AD_SLOTS.MULTIPLEX} format="autorelaxed" style={{ minHeight: '300px' }} className="mb-6" />

        {/* SEO 태그 */}
        <div className="flex flex-wrap gap-2">
          {article.seoKeywords.map((kw) => (
            <span key={kw} className="bg-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full">
              #{kw}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
