'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import AdBanner from '../components/AdBanner'
import RelatedContent, { getRelatedLinks } from '../components/RelatedContent'
import type { YouTubeVideo } from '../types'

export default function YouTubePage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/youtube')
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || '영상을 불러오는데 실패했습니다')
        }
        
        setVideos(data.videos)
      } catch (err) {
        console.error('영상 데이터 로딩 오류:', err)
        setError(err instanceof Error ? err.message : '영상을 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [])

  const relatedLinks = getRelatedLinks('/youtube')

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">최신 비트코인 영상</h1>
        <LoadingSpinner message="영상을 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">최신 비트코인 영상</h1>
        <ErrorMessage message={error} />
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">최신 비트코인 영상</h1>
        <EmptyState message="표시할 영상이 없습니다." icon="🎥" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">최신 비트코인 영상</h1>

      <div className="mb-6">
        <AdBanner slot="5844761425" format="horizontal" style={{ minHeight: '90px' }} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <div key={video.id}>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden hover:border-yellow-400 transition-colors">
              <a
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative"
              >
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title}
                  width={480}
                  height={270}
                  className="w-full aspect-video object-cover"
                />
              </a>
              
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-yellow-400"
                  >
                    {video.title}
                  </a>
                </h3>
                
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <span>{video.channelTitle}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{video.formattedDate}</span>
                </div>
              </div>
            </div>
            {(index + 1) % 6 === 0 && (
              <div className="my-4">
                <AdBanner slot="9632784159" format="auto" style={{ minHeight: '100px' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="my-6">
        <AdBanner slot="5844761427" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      <RelatedContent links={relatedLinks} />
    </div>
  )
}
