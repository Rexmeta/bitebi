'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '../../components/AdBanner'
import { NewsArticleJsonLd } from '../../components/JsonLd'
import RelatedContent, { getRelatedLinks } from '../../components/RelatedContent'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import type { Article } from '../../types'

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function generateSlug(title: string): string {
  return encodeURIComponent(title.slice(0, 80).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9가-힣\-]/g, '').toLowerCase())
}

const CATEGORY_LABELS: Record<string, string> = {
  bitcoin: '비트코인',
  ethereum: '이더리움',
  altcoin: '알트코인',
  defi: 'DeFi',
  regulation: '규제/정책',
  nft: 'NFT',
  general: '일반',
}

export default function NewsDetailPage() {
  const searchParams = useSearchParams()
  const articleUrl = searchParams.get('url') || ''
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/aggregate-news')
        if (!res.ok) return
        const data = await res.json()
        if (!data.success) return
        const allArticles: Article[] = data.articles

        const found = allArticles.find(a => a.link === articleUrl)
        if (found) {
          setArticle(found)
          const related = allArticles
            .filter(a => a.link !== found.link)
            .filter(a => a.category === found.category || a.source === found.source)
            .slice(0, 6)
          setRelatedArticles(related)
        }
      } catch (err) {
        console.error('기사 로딩 오류:', err)
      } finally {
        setIsLoading(false)
      }
    }
    if (articleUrl) fetchArticles()
    else setIsLoading(false)
  }, [articleUrl])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSpinner message="기사를 불러오는 중..." />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-400 text-lg mb-4">기사를 찾을 수 없습니다.</p>
        <Link href="/news" className="text-yellow-400 hover:underline">뉴스 목록으로 돌아가기</Link>
      </div>
    )
  }

  const relatedLinks = getRelatedLinks('/news', [
    { href: '/', title: '시장 요약', description: '실시간 암호화폐 시세 및 시장 개요', icon: '📊' },
    { href: '/fear-greed', title: '공포·탐욕 지수', description: '시장 심리 분석 지표', icon: '😱' },
  ])

  return (
    <div className="max-w-4xl mx-auto">
      <NewsArticleJsonLd
        title={article.title}
        description={article.contentSnippet}
        url={article.link}
        datePublished={article.pubDate}
        source={article.source}
      />

      {/* 브레드크럼 */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white">홈</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-white">뉴스</Link>
        <span>/</span>
        <span className="text-gray-500 truncate max-w-[200px]">{article.title.slice(0, 40)}...</span>
      </nav>

      {/* ── 기사 본문 카드 ── */}
      <article className="bg-[#161b22] rounded-xl border border-[#2d333b] overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* 태그 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs px-2 py-1 bg-yellow-400/10 text-yellow-400 rounded-full font-medium">
              {article.source}
            </span>
            {article.category && article.category !== 'general' && (
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                {CATEGORY_LABELS[article.category] || article.category}
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-[#21262d] text-gray-400 rounded-full">
              {timeAgo(article.pubDate)}
            </span>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
            {article.title}
          </h1>

          {/* ── 제목 아래 첫 번째 in-article 광고 (가장 높은 viewability) ── */}
          <div className="my-6">
            <AdBanner
              slot={AD_SLOTS.IN_ARTICLE}
              format="auto"
              style={{ minHeight: '280px' }}
              label="광고"
            />
          </div>

          {/* 요약 본문 */}
          {article.contentSnippet && (
            <p className="text-gray-300 text-base leading-relaxed mb-6 border-l-2 border-yellow-400/30 pl-4">
              {article.contentSnippet}
            </p>
          )}

          {/* 메타 */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
            <span>{article.source}</span>
            <span>·</span>
            <span>{new Date(article.pubDate).toLocaleString('ko-KR')}</span>
          </div>

          {/* ── 요약 본문 아래 두 번째 in-article 광고 ── */}
          <div className="my-6">
            <AdBanner
              slot={AD_SLOTS.IN_CONTENT}
              format="auto"
              style={{ minHeight: '250px' }}
              label="광고"
            />
          </div>

          {/* 원문 이동 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
            >
              원문 기사 읽기 →
            </a>
            <Link
              href="/news"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#21262d] text-gray-300 font-medium rounded-lg hover:bg-[#2d333b] transition-colors"
            >
              ← 뉴스 목록
            </Link>
          </div>
        </div>
      </article>

      {/* ── 기사 카드 아래 광고 ── */}
      <div className="my-6">
        <AdBanner
          slot={AD_SLOTS.FOOTER_BANNER}
          format="horizontal"
          style={{ minHeight: '90px' }}
          label="광고"
        />
      </div>

      {/* 관련 기사 */}
      {relatedArticles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">관련 기사</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {relatedArticles.map((related) => (
              <Link
                key={related.link}
                href={`/news/${generateSlug(related.title)}?url=${encodeURIComponent(related.link)}`}
                className="block p-4 bg-[#161b22] rounded-lg border border-[#2d333b] hover:border-[#3d444d] transition-colors"
              >
                <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">{related.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-[#21262d] text-gray-300 rounded">{related.source}</span>
                  <span className="text-xs text-gray-500">{timeAgo(related.pubDate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── 관련 기사 아래 Multiplex 광고 ── */}
      <div className="my-8">
        <AdBanner
          slot={AD_SLOTS.MULTIPLEX}
          format="autorelaxed"
          variant="multiplex"
          label="추천 콘텐츠"
        />
      </div>

      <RelatedContent links={relatedLinks} />
    </div>
  )
}
