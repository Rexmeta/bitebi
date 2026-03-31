'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import AdBanner from '../components/AdBanner'
import RelatedContent, { getRelatedLinks } from '../components/RelatedContent'
import type { Article } from '../types'

const CATEGORIES = [
  { id: 'all', label: '전체', icon: '📰' },
  { id: 'bitcoin', label: '비트코인', icon: '₿' },
  { id: 'ethereum', label: '이더리움', icon: '◆' },
  { id: 'altcoin', label: '알트코인', icon: '🪙' },
  { id: 'defi', label: 'DeFi', icon: '🏦' },
  { id: 'regulation', label: '규제/정책', icon: '⚖️' },
  { id: 'nft', label: 'NFT', icon: '🎨' },
]

const TIME_FILTERS = [
  { id: 'all', label: '전체' },
  { id: '1h', label: '1시간', ms: 60 * 60 * 1000 },
  { id: '6h', label: '6시간', ms: 6 * 60 * 60 * 1000 },
  { id: '24h', label: '24시간', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '1주일', ms: 7 * 24 * 60 * 60 * 1000 },
]

const SOURCES = ['전체', 'Cointelegraph', 'Decrypt', 'CoinDesk', 'CryptoSlate', 'Bitcoin Magazine']

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

function detectTrendIcon(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('surge') || lower.includes('soars') || lower.includes('pump') || lower.includes('record') || lower.includes('rally')) return '🚀'
  if (lower.includes('drop') || lower.includes('crash') || lower.includes('plummet') || lower.includes('dump')) return '🔻'
  if (lower.includes('hack') || lower.includes('exploit') || lower.includes('security')) return '⚠️'
  if (lower.includes('regulation') || lower.includes('sec') || lower.includes('ban')) return '⚖️'
  if (lower.includes('bullish')) return '🐂'
  if (lower.includes('bearish')) return '🐻'
  return ''
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTime, setActiveTime] = useState('all')
  const [activeSource, setActiveSource] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch('/api/aggregate-news')
        if (!res.ok) throw new Error(`뉴스 데이터를 가져오는데 실패했습니다 (${res.status})`)
        const data = await res.json()
        if (data.success) {
          setArticles(data.articles)
        } else {
          throw new Error(data.error || '뉴스 데이터를 가져오는데 실패했습니다')
        }
      } catch (err) {
        console.error('뉴스 데이터 로딩 오류:', err)
        setError(err instanceof Error ? err.message : '뉴스를 불러올 수 없습니다')
      } finally {
        setIsLoading(false)
      }
    }
    fetchNews()
  }, [])

  const popularArticles = useMemo(() => {
    if (articles.length === 0) return []
    const titleWords = new Map<string, number>()
    articles.forEach(a => {
      const words = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 4)
      words.forEach(w => titleWords.set(w, (titleWords.get(w) || 0) + 1))
    })
    return articles
      .map(a => {
        const words = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 4)
        const score = words.reduce((sum, w) => sum + (titleWords.get(w) || 0), 0)
        return { ...a, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [articles])

  const filteredArticles = useMemo(() => {
    let result = [...articles]
    if (activeCategory !== 'all') {
      result = result.filter(a => a.category === activeCategory)
    }
    if (activeTime !== 'all') {
      const filter = TIME_FILTERS.find(t => t.id === activeTime)
      if (filter?.ms) {
        const cutoff = Date.now() - filter.ms
        result = result.filter(a => new Date(a.pubDate).getTime() > cutoff)
      }
    }
    if (activeSource !== '전체') {
      result = result.filter(a => a.source === activeSource)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.contentSnippet && a.contentSnippet.toLowerCase().includes(q))
      )
    }
    return result
  }, [articles, activeCategory, activeTime, activeSource, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length }
    articles.forEach(a => {
      const cat = a.category || 'general'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [articles])

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스</h1>
        <LoadingSpinner message="뉴스를 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스</h1>
        <ErrorMessage message={error} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">실시간 암호화폐 뉴스</h1>
          <p className="text-gray-400 text-sm mt-1">비트코인, 이더리움 등 주요 암호화폐 뉴스를 실시간으로 전달합니다.</p>
        </div>
      </div>

      <AdBanner slot="5844761425" format="auto" style={{ minHeight: '100px' }} />

      {popularArticles.length > 0 && (
        <div className="mb-6 mt-4">
          <h2 className="text-lg font-semibold text-yellow-300 mb-3">인기 기사</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularArticles.slice(0, 3).map((article, i) => (
              <Link
                key={article.link}
                href={`/news/${generateSlug(article.title)}?url=${encodeURIComponent(article.link)}`}
                className="block p-4 bg-gradient-to-br from-[#1c2128] to-[#161b22] rounded-lg border border-yellow-400/20 hover:border-yellow-400/50 transition-all"
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl font-bold text-yellow-400/40">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white leading-snug line-clamp-3">{detectTrendIcon(article.title)} {article.title}</h3>
                    <div className="text-xs text-gray-400 mt-2">{article.source} · {timeAgo(article.pubDate)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-2 text-sm rounded-full border transition-colors ${
              activeCategory === cat.id
                ? 'bg-yellow-400 text-black border-yellow-400 font-medium'
                : 'bg-[#21262d] text-gray-300 border-[#30363d] hover:border-yellow-400/50'
            }`}
          >
            {cat.icon} {cat.label}
            {categoryCounts[cat.id] !== undefined && (
              <span className="ml-1 text-xs opacity-70">({categoryCounts[cat.id]})</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="뉴스 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 bg-[#0d1117] text-white px-4 py-2 text-sm rounded-lg border border-[#30363d] focus:border-yellow-400/50 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {TIME_FILTERS.map(tf => (
            <button
              key={tf.id}
              onClick={() => setActiveTime(tf.id)}
              className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap border transition-colors ${
                activeTime === tf.id
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  : 'bg-[#21262d] text-gray-400 border-[#30363d] hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SOURCES.map(src => (
          <button
            key={src}
            onClick={() => setActiveSource(src)}
            className={`px-3 py-2 text-xs rounded-full whitespace-nowrap border transition-colors ${
              activeSource === src
                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                : 'bg-[#21262d] text-gray-400 border-[#30363d] hover:text-white'
            }`}
          >
            {src}
          </button>
        ))}
      </div>

      {filteredArticles.length === 0 ? (
        <EmptyState message="조건에 맞는 뉴스가 없습니다. 필터를 조정해 보세요." icon="🔍" />
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">{filteredArticles.length}개의 기사</p>
          <div className="space-y-3">
            {filteredArticles.map((article, index) => (
              <div key={article.link}>
                <Link
                  href={`/news/${generateSlug(article.title)}?url=${encodeURIComponent(article.link)}`}
                  className="block p-4 bg-[#161b22] rounded-lg hover:bg-[#1c2128] transition-colors border border-[#2d333b] hover:border-[#3d444d]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-white leading-snug">
                        {detectTrendIcon(article.title)} {article.title}
                      </h3>
                      {article.contentSnippet && (
                        <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{article.contentSnippet}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-[#21262d] text-gray-300 rounded">{article.source}</span>
                        {article.category && article.category !== 'general' && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-400/10 text-yellow-400 rounded">
                            {CATEGORIES.find(c => c.id === article.category)?.label || article.category}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{timeAgo(article.pubDate)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
                {((index === 2) || (index > 2 && (index - 2) % 5 === 0)) && (
                  <div className="my-4">
                    <AdBanner slot="5844761425" format="auto" style={{ minHeight: '100px' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="my-6">
        <AdBanner slot="5844761427" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      <RelatedContent links={getRelatedLinks('/news')} />
    </div>
  )
}
