'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import AdBanner, { AD_SLOTS } from '../components/AdBanner'
import RelatedContent, { getRelatedLinks } from '../components/RelatedContent'
import type { UnifiedFeedItem } from '../types'

// ── 카테고리 & 필터 상수 ───────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: '전체',    icon: '📰' },
  { id: 'bitcoin',    label: '비트코인', icon: '₿'  },
  { id: 'ethereum',   label: '이더리움', icon: '◆'  },
  { id: 'altcoin',    label: '알트코인', icon: '🪙' },
  { id: 'defi',       label: 'DeFi',    icon: '🏦' },
  { id: 'regulation', label: '규제/정책',icon: '⚖️' },
  { id: 'analysis',   label: 'AI 분석', icon: '🤖' },
  { id: 'brief',      label: '브리핑',  icon: '⚡' },
]

const TIME_FILTERS = [
  { id: 'all', label: '전체' },
  { id: '6h',  label: '6시간',  ms: 6  * 60 * 60 * 1000 },
  { id: '24h', label: '24시간', ms: 24 * 60 * 60 * 1000 },
  { id: '7d',  label: '1주일',  ms: 7  * 24 * 60 * 60 * 1000 },
]

const SOURCE_TABS = [
  { id: 'all',       label: '전체' },
  { id: 'bitebi',    label: '🤖 Bitebi AI' },
  { id: 'Cointelegraph', label: 'Cointelegraph' },
  { id: 'CoinDesk',  label: 'CoinDesk' },
  { id: 'Decrypt',   label: 'Decrypt' },
]

// ── 뱃지 색상 맵 ──────────────────────────────────────────────
const BADGE_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30',
  blue:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  green:  'bg-green-500/20 text-green-300 border border-green-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
}

// ── 헬퍼 ──────────────────────────────────────────────────────
function timeAgo(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
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
  if (/surge|soar|pump|record|rally|jump/.test(lower)) return '🚀'
  if (/drop|crash|plummet|dump|fall/.test(lower)) return '🔻'
  if (/hack|exploit|security|breach/.test(lower)) return '⚠️'
  if (/regulation|sec|ban|law/.test(lower)) return '⚖️'
  if (/bullish/.test(lower)) return '🐂'
  if (/bearish/.test(lower)) return '🐻'
  return ''
}

// ── AI 콘텐츠 전용 카드 컴포넌트 ─────────────────────────────
function AiContentCard({ item }: { item: UnifiedFeedItem }) {
  const badgeClass = BADGE_CLASSES[item.badgeColor ?? 'yellow']
  const trendIcon = item.contentType === 'rss' ? detectTrendIcon(item.title) : (item.emoji ?? '')

  // 카드 배경 스타일: contentType별 차별화
  const cardBg: Record<string, string> = {
    'daily-report':  'bg-gradient-to-r from-yellow-900/20 to-[#161b22] border-yellow-500/30',
    'brief':         'bg-gradient-to-r from-orange-900/20 to-[#161b22] border-orange-500/30',
    'topic':         'bg-gradient-to-r from-purple-900/20 to-[#161b22] border-purple-500/30',
    'glossary':      'bg-gradient-to-r from-green-900/20 to-[#161b22] border-green-500/30',
    'coin-analysis': 'bg-gradient-to-r from-blue-900/20 to-[#161b22] border-blue-500/30',
    'rss':           'bg-[#161b22] border-[#2d333b]',
  }
  const bg = cardBg[item.contentType] ?? cardBg.rss

  const cardContent = (
    <div className={`p-4 rounded-xl border transition-all hover:brightness-110 ${bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">

          {/* 뱃지 행 */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {item.badgeLabel && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
                {item.contentType !== 'rss' ? '🤖 ' : ''}{item.badgeLabel}
              </span>
            )}
            {item.category && item.category !== 'general' && (
              <span className="text-[10px] px-2 py-0.5 bg-[#21262d] text-gray-400 rounded-full">
                {CATEGORIES.find(c => c.id === item.category)?.icon} {CATEGORIES.find(c => c.id === item.category)?.label ?? item.category}
              </span>
            )}
            <span className="text-[10px] text-gray-500 ml-auto shrink-0">{timeAgo(item.pubDate)}</span>
          </div>

          {/* 제목 */}
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {trendIcon && <span className="mr-1">{trendIcon}</span>}
            {item.title}
          </h3>

          {/* 스니펫 */}
          {item.snippet && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
              {item.snippet}
            </p>
          )}

          {/* 출처 */}
          <p className="text-[10px] text-gray-500 mt-2">{item.source}</p>
        </div>

        {/* AI 아이콘 (자체 콘텐츠에만) */}
        {item.contentType !== 'rss' && (
          <span className="text-2xl shrink-0 mt-1 opacity-60">{item.emoji ?? '🤖'}</span>
        )}
      </div>
    </div>
  )

  // 내부 링크 vs 외부 링크
  if (!item.isExternal) {
    return <Link href={item.link}>{cardContent}</Link>
  }
  // RSS 기사는 내부 상세 페이지로 라우팅 → SEO + 사이트 체류 시간 향상
  const detailHref = `/news/${generateSlug(item.title)}?url=${encodeURIComponent(item.link)}`
  return (
    <Link href={detailHref} className="block">
      {cardContent}
    </Link>
  )
}

// ── 핀 카드 (오늘 리포트 / 오늘 브리핑) ─────────────────────
function PinnedCard({ item }: { item: UnifiedFeedItem }) {
  const isReport = item.contentType === 'daily-report'
  const gradient = isReport
    ? 'from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400'
    : 'from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400'

  return (
    <Link href={item.link} className="block">
      <div className={`bg-gradient-to-r ${gradient} rounded-xl p-4 transition-all`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-black/70 text-xs font-semibold uppercase">
                {isReport ? '📊 오늘의 AI 분석 리포트' : '⚡ 오늘의 브리핑'}
              </span>
              <span className="bg-black/20 text-black text-[10px] px-2 py-0.5 rounded-full">NEW</span>
            </div>
            <h3 className="text-black font-bold text-sm leading-snug line-clamp-2">{item.title}</h3>
            <p className="text-black/70 text-xs mt-1">{item.source} · {timeAgo(item.pubDate)}</p>
          </div>
          <span className="text-3xl ml-3 shrink-0">{item.emoji ?? '🤖'}</span>
        </div>
      </div>
    </Link>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function NewsPage() {
  const [allItems, setAllItems]       = useState<UnifiedFeedItem[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeCategory, setCategory] = useState('all')
  const [activeTime, setActiveTime]   = useState('all')
  const [activeSource, setSource]     = useState('all')
  const [searchQuery, setSearch]      = useState('')

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/unified-news')
      .then(r => r.json())
      .then(json => {
        if (json.success) setAllItems(json.items ?? [])
        else throw new Error(json.error ?? '뉴스를 불러오지 못했습니다')
      })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  // 고정 아이템 (상단 노출)
  const pinnedItems = useMemo(() => allItems.filter(i => i.pinned), [allItems])

  // 필터 적용
  const filteredItems = useMemo(() => {
    let result = allItems.filter(i => !i.pinned)

    if (activeCategory !== 'all')
      result = result.filter(i => i.category === activeCategory)

    if (activeTime !== 'all') {
      const tf = TIME_FILTERS.find(t => t.id === activeTime)
      if (tf?.ms) {
        const cutoff = Date.now() - tf.ms
        result = result.filter(i => new Date(i.pubDate).getTime() > cutoff)
      }
    }

    if (activeSource !== 'all') {
      if (activeSource === 'bitebi') {
        result = result.filter(i => i.contentType !== 'rss')
      } else {
        result = result.filter(i => i.source === activeSource)
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.snippet.toLowerCase().includes(q)
      )
    }

    return result
  }, [allItems, activeCategory, activeTime, activeSource, searchQuery])

  // 카테고리별 카운트
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allItems.length }
    allItems.forEach(i => {
      const c = i.category || 'general'
      counts[c] = (counts[c] || 0) + 1
    })
    return counts
  }, [allItems])

  // 인기 기사 (RSS만, 상위 3개)
  const popularRss = useMemo(() => {
    const rss = allItems.filter(i => i.contentType === 'rss')
    const wordCount = new Map<string, number>()
    rss.forEach(a => {
      a.title.toLowerCase().split(/\s+/).filter(w => w.length > 4)
        .forEach(w => wordCount.set(w, (wordCount.get(w) || 0) + 1))
    })
    return rss
      .map(a => ({
        ...a,
        score: a.title.toLowerCase().split(/\s+/).filter(w => w.length > 4)
          .reduce((s, w) => s + (wordCount.get(w) || 0), 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [allItems])

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스 & AI 분석</h1>
        <LoadingSpinner message="뉴스와 AI 분석을 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스 & AI 분석</h1>
        <ErrorMessage message={error} />
      </div>
    )
  }

  const aiCount = allItems.filter(i => i.contentType !== 'rss').length
  const rssCount = allItems.filter(i => i.contentType === 'rss').length

  return (
    <div className="max-w-6xl mx-auto">

      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">실시간 암호화폐 뉴스 & AI 분석</h1>
          <p className="text-gray-400 text-sm mt-1">
            외신 {rssCount}개 + AI 자체 분석 {aiCount}개 통합 피드
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-xs bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-1 rounded-full">
            🤖 AI 생성 포함
          </span>
        </div>
      </div>

      {/* ATF 광고 */}
      <div className="mb-5">
        <AdBanner slot={AD_SLOTS.IN_CONTENT} format="auto" style={{ minHeight: '250px' }} label="광고" />
      </div>

      {/* ── 고정 카드 (오늘 AI 리포트 + 브리핑) ── */}
      {pinnedItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {pinnedItems.map(item => <PinnedCard key={item.id} item={item} />)}
        </div>
      )}

      {/* ── 인기 기사 ── */}
      {popularRss.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            🔥 인기 기사
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {popularRss.map((item, i) => (
              <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
                 className="block p-4 bg-gradient-to-br from-[#1c2128] to-[#161b22] rounded-xl border border-yellow-400/20 hover:border-yellow-400/40 transition-all">
                <div className="flex items-start gap-2">
                  <span className="text-2xl font-bold text-yellow-400/40 shrink-0">{i + 1}</span>
                  <div>
                    <h3 className="text-xs font-medium text-white leading-snug line-clamp-3">
                      {detectTrendIcon(item.title)} {item.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1.5">{item.source} · {timeAgo(item.pubDate)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── 카테고리 필터 ── */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              activeCategory === cat.id
                ? 'bg-yellow-400 text-black border-yellow-400 font-semibold'
                : 'bg-[#21262d] text-gray-300 border-[#30363d] hover:border-yellow-400/50'
            }`}>
            {cat.icon} {cat.label}
            {catCounts[cat.id] !== undefined && (
              <span className="ml-1 opacity-60">({catCounts[cat.id]})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── 검색 + 시간 필터 ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input type="text" placeholder="뉴스 검색..." value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-[#0d1117] text-white px-3 py-2 text-xs rounded-lg border border-[#30363d] focus:border-yellow-400/50 focus:outline-none" />
        <div className="flex gap-1.5 flex-wrap">
          {TIME_FILTERS.map(tf => (
            <button key={tf.id} onClick={() => setActiveTime(tf.id)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                activeTime === tf.id
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  : 'bg-[#21262d] text-gray-400 border-[#30363d] hover:text-white'
              }`}>
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 소스 탭 ── */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SOURCE_TABS.map(s => (
          <button key={s.id} onClick={() => setSource(s.id)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              activeSource === s.id
                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                : 'bg-[#21262d] text-gray-400 border-[#30363d] hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── 통합 피드 ── */}
      {filteredItems.length === 0 ? (
        <EmptyState message="조건에 맞는 항목이 없습니다. 필터를 조정해 보세요." icon="🔍" />
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">{filteredItems.length}개 항목</p>
          <div className="space-y-2.5">
            {filteredItems.map((item, index) => (
              <div key={item.id}>
                <AiContentCard item={item} />

                {/* 4개마다 광고 삽입 (자체 콘텐츠 위치 전후로 자연스럽게) */}
                {(index + 1) % 4 === 0 && (
                  <div className="my-4">
                    <AdBanner
                      slot={index < 8 ? AD_SLOTS.IN_ARTICLE : AD_SLOTS.IN_CONTENT}
                      format="auto"
                      style={{ minHeight: '250px' }}
                      label="광고"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 하단 광고 */}
      <div className="my-6">
        <AdBanner slot={AD_SLOTS.FOOTER_BANNER} format="horizontal" style={{ minHeight: '90px' }} label="광고" />
      </div>
      <div className="my-6">
        <AdBanner slot={AD_SLOTS.MULTIPLEX} format="autorelaxed" variant="multiplex" label="추천 콘텐츠" />
      </div>

      <RelatedContent links={getRelatedLinks('/news')} />
    </div>
  )
}
