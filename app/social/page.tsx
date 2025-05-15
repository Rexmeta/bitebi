'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import AdBanner from '../components/AdBanner'

interface SocialPost {
  id: string
  platform: 'twitter' | 'reddit' | 'telegram'
  author: string
  content: string
  timestamp: string
  link: string
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
  }
}

export default function SocialFeedPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'twitter' | 'reddit'>('all')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/social-feeds')
        const data = await res.json()
        
        if (data.success) {
          setPosts(data.posts)
        } else {
          throw new Error(data.error)
        }
      } catch (e) {
        setError('소셜 피드를 불러오는데 실패했습니다.')
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
    // 1분마다 새로고침
    const interval = setInterval(fetchPosts, 60000)
    return () => clearInterval(interval)
  }, [])

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(post => post.platform === filter)

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case 'twitter':
        return <span className="text-blue-400">𝕏</span>
      case 'reddit':
        return <span className="text-orange-500">📱</span>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    )
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

      <div className="flex gap-2 mb-4">
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
          onClick={() => setFilter('twitter')}
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
      </div>

      <div className="space-y-4">
        {filteredPosts.map((post, index) => (
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
              onClick={() => window.open(post.link, '_blank')}
            >
              <div className="flex items-center gap-2 mb-2">
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
              <p className="text-white">{post.content}</p>
            </div>
          </>
        ))}
      </div>
    </div>
  )
} 