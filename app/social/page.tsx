'use client'
import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { storage } from '../utils/storage'
import AdBanner from '../components/AdBanner'
import debounce from 'lodash/debounce'
import { SocialFeedJsonLd } from '../components/JsonLd'
import { SocialFeed } from '../types/social'

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<SocialFeed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'reddit' | 'medium' | 'twitter'>('all')
  const [category, setCategory] = useState<'all' | 'community' | 'news' | 'education'>('all')
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
        ...(category !== 'all' && { category }),
        ...(keyword && { keyword })
      })
      
      const res = await fetch(`/api/social?${params}`)
      const data = await res.json()
      
      if (data.success) {
        setPosts(prev => reset ? data.feeds : [...prev, ...data.feeds])
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
  }, [filter, category, keyword])

  // 무한 스크롤
  const lastElementRef = useInfiniteScroll({
    onLoadMore: () => {
      if (!isLoading && hasMore) {
        setPage(prev => prev + 1)
        fetchPosts(page + 1)
      }
    },
    hasMore
  })

  // 초기 로드 및 필터 변경 시
  useEffect(() => {
    // URL 파라미터 처리
    const params = new URLSearchParams(window.location.search)
    const platformParam = params.get('platform')
    const categoryParam = params.get('category')
    const filterParam = params.get('filter')
    
    if (platformParam && ['reddit', 'medium', 'twitter'].includes(platformParam)) {
      setFilter(platformParam as 'reddit' | 'medium' | 'twitter')
    }
    
    if (categoryParam && ['community', 'news', 'education'].includes(categoryParam)) {
      setCategory(categoryParam as 'community' | 'news' | 'education')
    }
    
    if (filterParam === 'bookmarks') {
      setShowBookmarksOnly(true)
    }
    
    setPage(1)
    fetchPosts(1, true)
  }, [filter, category, fetchPosts])

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
      case 'medium':
        return <span className="text-green-500">📝</span>
      default:
        return null
    }
  }

  // URL 변경 처리를 위한 함수
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter)
    const url = new URL(window.location.href)
    url.searchParams.set('platform', newFilter)
    window.history.pushState({}, '', url)
  }

  const handleCategoryChange = (newCategory: typeof category) => {
    setCategory(newCategory)
    const url = new URL(window.location.href)
    url.searchParams.set('category', newCategory)
    window.history.pushState({}, '', url)
  }

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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-yellow-400">소셜 피드</h1>

        <div className="flex flex-col gap-4 mb-6">
          {/* 플랫폼 필터 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange('all')}
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
              onClick={() => handleFilterChange('reddit')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'reddit'
                  ? 'bg-orange-500 text-black'
                  : 'border border-orange-500 text-orange-500'
              }`}
            >
              Reddit
            </button>
            <button
              onClick={() => handleFilterChange('medium')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'medium'
                  ? 'bg-green-500 text-black'
                  : 'border border-green-500 text-green-500'
              }`}
            >
              Medium
            </button>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                category === 'all' 
                  ? 'bg-yellow-400 text-black' 
                  : 'border border-yellow-400 text-yellow-400'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleCategoryChange('community')}
              className={`px-3 py-1 rounded-full text-sm ${
                category === 'community'
                  ? 'bg-purple-500 text-black'
                  : 'border border-purple-500 text-purple-500'
              }`}
            >
              커뮤니티
            </button>
            <button
              onClick={() => handleCategoryChange('news')}
              className={`px-3 py-1 rounded-full text-sm ${
                category === 'news'
                  ? 'bg-blue-500 text-black'
                  : 'border border-blue-500 text-blue-500'
              }`}
            >
              뉴스
            </button>
            <button
              onClick={() => handleCategoryChange('education')}
              className={`px-3 py-1 rounded-full text-sm ${
                category === 'education'
                  ? 'bg-green-500 text-black'
                  : 'border border-green-500 text-green-500'
              }`}
            >
              교육
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

        {/* 소셜 피드 */}
        <div className="space-y-4">
          {displayPosts.map((post, index) => (
            <div key={post.id}>
              <div className="bg-[#161b22] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={post.platform} />
                    <span className="font-medium text-yellow-400">
                      {post.author}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(post.publishedAt), {
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

                <h2 className="text-lg font-semibold text-white mb-2">{post.title}</h2>
                <p className="text-white mb-2">{post.content}</p>

                {/* 카테고리 태그 */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="px-2 py-0.5 text-xs bg-[#2d333b] text-gray-300 rounded-full">
                    #{post.category}
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-[#2d333b] text-gray-300 rounded-full">
                    #{post.source}
                  </span>
                </div>

                {/* 링크 */}
                <div className="flex justify-end">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    원본 보기 →
                  </a>
                </div>
              </div>
              {/* 포스트 사이 광고 (3개마다) */}
              {(index + 1) % 3 === 0 && (
                <div className="my-4">
                  <AdBanner 
                    slot="5844761429"
                    format="horizontal"
                    style={{ minHeight: '100px' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 하단 광고 */}
        <div className="mt-4">
          <AdBanner 
            slot="5844761430"
            format="horizontal"
            style={{ minHeight: '100px' }}
          />
        </div>
      </div>
    </>
  )
} 