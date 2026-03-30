'use client'
import Image from 'next/image'
import { useEffect, useState, useCallback, useRef } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import AdBanner from '../components/AdBanner'
import RelatedContent, { getRelatedLinks } from '../components/RelatedContent'
import type { YouTubeVideo, YouTubeChannel, YouTubeCategory, YouTubeLanguage } from '../types'

const CATEGORIES: YouTubeCategory[] = ['시장 분석', '교육/입문', '뉴스', '기술/개발']

function VideoModal({ video, onClose }: { video: YouTubeVideo; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#0d1117] rounded-lg"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white hover:text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-lg z-20"
          aria-label="닫기"
        >
          ✕
        </button>
        <div className="relative w-full rounded-t-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4">
          <h3 className="text-white font-semibold text-lg mb-1">{video.title}</h3>
          <p className="text-gray-400 text-sm">{video.channelTitle} · {video.formattedDate}</p>
        </div>
      </div>
    </div>
  )
}

function HighlightSection({
  highlights,
  onVideoClick,
}: {
  highlights: YouTubeVideo[]
  onVideoClick: (video: YouTubeVideo) => void
}) {
  if (highlights.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-yellow-400 mb-3">🔥 채널별 최신 하이라이트</h2>
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-600">
        {highlights.map(video => (
          <div
            key={video.id}
            className="flex-shrink-0 w-64 bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden cursor-pointer hover:border-yellow-400 transition-colors"
            onClick={() => onVideoClick(video)}
          >
            <div className="relative">
              <Image
                src={video.thumbnailUrl}
                alt={video.title}
                width={256}
                height={144}
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-3xl">▶</span>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2 text-white">{video.title}</p>
              <p className="text-xs text-gray-400 mt-1">{video.channelTitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function YouTubePage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [highlights, setHighlights] = useState<YouTubeVideo[]>([])
  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<YouTubeLanguage>('ko')
  const [selectedCategory, setSelectedCategory] = useState<YouTubeCategory | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [modalVideo, setModalVideo] = useState<YouTubeVideo | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchVideos = useCallback(async (pageNum: number, append: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('language', selectedLanguage)
      if (selectedCategory) params.set('category', selectedCategory)
      if (selectedChannel) params.set('channelId', selectedChannel)
      params.set('page', String(pageNum))
      params.set('limit', '20')

      const response = await fetch(`/api/youtube?${params}`, { signal: controller.signal })
      const data = await response.json()

      if (controller.signal.aborted) return

      if (!data.success) {
        throw new Error(data.error || '영상을 불러오는데 실패했습니다')
      }

      if (append) {
        setVideos(prev => [...prev, ...data.videos])
      } else {
        setVideos(data.videos)
        setHighlights(data.highlights || [])
      }
      setChannels(data.channels || [])
      setHasMore(pageNum < data.pagination.totalPages)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('영상 데이터 로딩 오류:', err)
      setError(err instanceof Error ? err.message : '영상을 불러오는데 실패했습니다')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [selectedLanguage, selectedCategory, selectedChannel])

  useEffect(() => {
    setPage(1)
    setVideos([])
    setHasMore(true)
    fetchVideos(1, false)
  }, [selectedLanguage, selectedCategory, selectedChannel, fetchVideos])

  useEffect(() => {
    if (!observerRef.current || !hasMore || loadingMore || loading) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchVideos(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page, fetchVideos])

  const filteredChannels = channels.filter(c => c.language === selectedLanguage)
  const relatedLinks = getRelatedLinks('/youtube')

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">크립토 유튜브 큐레이션</h1>

      <div className="mb-6">
        <AdBanner slot="5844761425" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-[#30363d]">
          <button
            onClick={() => { setSelectedLanguage('ko'); setSelectedChannel('') }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedLanguage === 'ko'
                ? 'bg-yellow-400 text-black'
                : 'bg-[#161b22] text-gray-300 hover:bg-[#21262d]'
            }`}
          >
            🇰🇷 한국어
          </button>
          <button
            onClick={() => { setSelectedLanguage('en'); setSelectedChannel('') }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedLanguage === 'en'
                ? 'bg-yellow-400 text-black'
                : 'bg-[#161b22] text-gray-300 hover:bg-[#21262d]'
            }`}
          >
            🇺🇸 English
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              selectedCategory === null
                ? 'bg-yellow-400 text-black font-semibold'
                : 'bg-[#161b22] text-gray-300 border border-[#30363d] hover:border-yellow-400'
            }`}
          >
            전체
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                selectedCategory === cat
                  ? 'bg-yellow-400 text-black font-semibold'
                  : 'bg-[#161b22] text-gray-300 border border-[#30363d] hover:border-yellow-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          value={selectedChannel}
          onChange={e => setSelectedChannel(e.target.value)}
          className="bg-[#161b22] text-gray-300 border border-[#30363d] rounded-lg px-3 py-1.5 text-xs focus:border-yellow-400 focus:outline-none"
        >
          <option value="">모든 채널</option>
          {filteredChannels.map(ch => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="영상을 불러오는 중..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : videos.length === 0 ? (
        <EmptyState message="표시할 영상이 없습니다." icon="🎥" />
      ) : (
        <>
          <HighlightSection highlights={highlights} onVideoClick={setModalVideo} />

          <h2 className="text-lg font-bold text-white mb-4">📺 전체 영상</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, idx) => (
              <div key={`${video.id}-${idx}`}>
                <div
                  className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden hover:border-yellow-400 transition-colors cursor-pointer"
                  onClick={() => setModalVideo(video)}
                >
                  <div className="relative">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      width={480}
                      height={270}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-4xl">▶</span>
                    </div>
                    <span className="absolute top-2 right-2 bg-black/70 text-xs text-gray-300 px-2 py-0.5 rounded">
                      {video.category}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2 text-white">{video.title}</h3>
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <span>{video.channelTitle}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{video.formattedDate}</span>
                    </div>
                  </div>
                </div>
                {(idx + 1) % 6 === 0 && (
                  <div className="my-4">
                    <AdBanner slot="9632784159" format="auto" style={{ minHeight: '100px' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {loadingMore && (
            <div className="mt-6">
              <LoadingSpinner size="sm" message="더 불러오는 중..." />
            </div>
          )}

          <div ref={observerRef} className="h-10" />
        </>
      )}

      <div className="my-6">
        <AdBanner slot="5844761427" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      <RelatedContent links={relatedLinks} />

      {modalVideo && <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />}
    </div>
  )
}
