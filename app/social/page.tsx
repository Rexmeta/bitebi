'use client'
import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { storage } from '../utils/storage'
import AdBanner from '../components/AdBanner'
import debounce from 'lodash/debounce'
import { SocialFeedJsonLd } from '../components/JsonLd'

interface SocialPost {
  id: string
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord'
  author: string
  content: string
  timestamp: string
  link: string
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
    views?: number
  }
  keywords?: string[]
}

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'twitter' | 'reddit' | 'telegram'>('all')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)

  const fetchPosts = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: pageNum.toString(),
        ...(filter !== 'all' && { platform: filter }),
        ...(keyword && { keyword })
      })
      
      const res = await fetch(`/api/social-feeds?${params}`)
      const data = await res.json()
      
      if (data.success) {
        setPosts(prev => reset ? data.posts : [...prev, ...data.posts])
        setHasMore(data.hasMore)
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      setError('소셜 피드를 불러오는데 실패했습니다.')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [filter, keyword])

  // 무한 스크롤
  useInfiniteScroll(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1)
      fetchPosts(page + 1)
    }
  }, hasMore)

  // 초기 로드 및 필터 변경 시
  useEffect(() => {
    // URL 파라미터 처리
    const params = new URLSearchParams(window.location.search);
    const platformParam = params.get('platform');
    const filterParam = params.get('filter');
    
    if (platformParam && ['twitter', 'reddit', 'telegram'].includes(platformParam)) {
      setFilter(platformParam as 'twitter' | 'reddit' | 'telegram');
    }
    
    if (filterParam === 'bookmarks') {
      setShowBookmarksOnly(true);
    }
    
    setPage(1);
    fetchPosts(1, true);
  }, [filter, fetchPosts]);

  // 키워드 검색 디바운스
  const debouncedSearch = debounce((value: string) => {
    setKeyword(value)
    setPage(1)
    fetchPosts(1, true)
  }, 500)

  // 북마크 로드
  useEffect(() => {
    setBookmarks(storage.getBookmarks())
  }, [])

  const toggleBookmark = (postId: string) => {
    if (bookmarks.includes(postId)) {
      storage.removeBookmark(postId)
      setBookmarks(prev => prev.filter(id => id !== postId))
    } else {
      storage.saveBookmark(postId)
      setBookmarks(prev => [...prev, postId])
    }
  }

  const displayPosts = showBookmarksOnly
    ? posts.filter(post => bookmarks.includes(post.id))
    : posts

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case 'twitter':
        return <span className="text-blue-400">𝕏</span>
      case 'reddit':
        return <span className="text-orange-500">📱</span>
      case 'telegram':
        return <span className="text-blue-500">✈️</span>
      default:
        return null
    }
  }

  // URL 변경 처리를 위한 함수 추가
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    const url = new URL(window.location.href);
    url.searchParams.set('platform', newFilter);
    window.history.pushState({}, '', url);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 text-red-200 rounded">
        <p>⚠️ {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm bg-red-800 hover:bg-red-700 px-3 py-1 rounded"
        >
          새로고침
        </button>
      </div>
    )
  }

  return (
    <>
      <SocialFeedJsonLd />
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">
            💬 암호화폐 소셜 피드
          </h1>
          <p className="text-gray-400 text-sm">
            주요 인플루언서와 커뮤니티의 실시간 업데이트
          </p>
        </div>

        {/* 상단 광고 배너 */}
        <AdBanner 
          slot="5844761425"
          format="horizontal"
          style={{ minHeight: '100px', marginBottom: '1rem' }}
        />

        <div className="flex flex-col gap-4 mb-6">
          {/* 플랫폼 필터 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' 
                  ? 'bg-yellow-400 text-black' 
                  : 'border border-yellow-400 text-yellow-400'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleFilterChange('twitter')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'twitter'
                  ? 'bg-blue-400 text-black'
                  : 'border border-blue-400 text-blue-400'
              }`}
            >
              Twitter
            </button>
            <button
              onClick={() => setFilter('reddit')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'reddit'
                  ? 'bg-orange-500 text-black'
                  : 'border border-orange-500 text-orange-500'
              }`}
            >
              Reddit
            </button>
            <button
              onClick={() => setFilter('telegram')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'telegram'
                  ? 'bg-blue-500 text-black'
                  : 'border border-blue-500 text-blue-500'
              }`}
            >
              Telegram
            </button>
          </div>

          {/* 검색 및 북마크 필터 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="🔍 키워드 검색..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="flex-1 bg-[#161b22] text-white px-3 py-2 rounded border border-[#2d333b] focus:border-yellow-400 focus:outline-none"
            />
            <button
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              className={`px-3 py-2 rounded text-sm ${
                showBookmarksOnly
                  ? 'bg-yellow-400 text-black'
                  : 'border border-yellow-400 text-yellow-400'
              }`}
            >
              🔖 북마크
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {displayPosts.map((post, index) => (
            <>
              {/* 5개 포스트마다 광고 삽입 */}
              {index > 0 && index % 5 === 0 && (
                <div key={`ad-${index}`} className="my-4">
                  <AdBanner 
                    slot="8421697053"
                    format="rectangle"
                    style={{ minHeight: '250px' }}
                  />
                </div>
              )}
              
              <div
                key={post.id}
                className="p-4 bg-[#161b22] rounded border border-[#2d333b] hover:bg-[#1c2129] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={post.platform} />
                    <span className="font-medium text-yellow-400">
                      {post.author}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(post.timestamp), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleBookmark(post.id)}
                    className="text-gray-400 hover:text-yellow-400"
                  >
                    {bookmarks.includes(post.id) ? '★' : '☆'}
                  </button>
                </div>

                <p className="text-white mb-2">{post.content}</p>

                {/* 키워드 태그 */}
                {post.keywords && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-[#2d333b] text-gray-300 rounded-full"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* 인게이지먼트 메트릭스 */}
                <div className="flex gap-4 text-sm text-gray-400">
                  {post.engagement?.likes && (
                    <span>❤️ {post.engagement.likes}</span>
                  )}
                  {post.engagement?.comments && (
                    <span>💬 {post.engagement.comments}</span>
                  )}
                  {post.engagement?.shares && (
                    <span>🔄 {post.engagement.shares}</span>
                  )}
                  {post.engagement?.views && (
                    <span>👁️ {post.engagement.views}</span>
                  )}
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    원본 보기 →
                  </a>
                </div>
              </div>
            </>
          ))}

          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            </div>
          )}

          {!isLoading && !hasMore && (
            <div className="text-center py-4 text-gray-400">
              더 이상 표시할 게시물이 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  )
} 