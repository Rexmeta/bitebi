'use client'
import { useEffect, useState } from 'react'
import { YouTubeVideo } from '../types/youtube'
import { getLatestVideos } from '../utils/youtube'

export default function YouTubePage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const data = await getLatestVideos()
        setVideos(data)
      } catch (err) {
        setError('비디오를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [])

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    const hours = (match[1] || '').replace('H', '')
    const minutes = (match[2] || '').replace('M', '')
    const seconds = (match[3] || '').replace('S', '')
    
    let result = ''
    if (hours) result += `${hours}:`
    result += `${minutes.padStart(2, '0')}:`
    result += seconds.padStart(2, '0')
    
    return result
  }

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#161b22] rounded-lg p-4 h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">최신 비트코인 영상</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden hover:border-yellow-400 transition-colors"
            >
              <a
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full aspect-video object-cover"
                />
                <span className="absolute bottom-2 right-2 bg-black bg-opacity-80 px-2 py-1 rounded text-sm">
                  {formatDuration(video.duration)}
                </span>
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
                  <a
                    href={`https://www.youtube.com/channel/${video.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-yellow-400"
                  >
                    {video.channelTitle}
                  </a>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{formatViewCount(video.viewCount)} views</span>
                  <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 