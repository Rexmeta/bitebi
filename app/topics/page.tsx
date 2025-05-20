'use client'
import { useEffect, useState } from 'react'
import TopicMap from '../components/TopicMap'
import { Topic } from '../types/topic'

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'mentions'>('recent')
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    // 클라이언트 사이드에서만 window 객체에 접근
    if (typeof window !== 'undefined') {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })

      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch('/api/topics')
        const data = await response.json()
        
        // 날짜 문자열을 Date 객체로 변환
        const processedData = data.map((topic: any) => ({
          ...topic,
          lastMentioned: new Date(topic.lastMentioned)
        }))
        
        setTopics(processedData)
      } catch (err) {
        setError('토픽을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchTopics()
    const interval = setInterval(fetchTopics, 5 * 60 * 1000) // 5분마다 업데이트
    return () => clearInterval(interval)
  }, [])

  const sortedTopics = [...topics].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        if (a.lastMentioned && b.lastMentioned) {
          return new Date(b.lastMentioned).getTime() - new Date(a.lastMentioned).getTime()
        }
        return 0
      case 'mentions':
        return b.mentionCount - a.mentionCount
      default:
        return 0
    }
  })

  if (loading) return <div className="text-center py-8">로딩 중...</div>
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">암호화폐 토픽 맵</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-4 py-2 rounded ${
              sortBy === 'recent' ? 'bg-yellow-400 text-black' : 'bg-gray-700'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy('mentions')}
            className={`px-4 py-2 rounded ${
              sortBy === 'mentions' ? 'bg-yellow-400 text-black' : 'bg-gray-700'
            }`}
          >
            언급순
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopicMap
            topics={topics}
            width={windowSize.width * 0.8}
            height={windowSize.height * 0.7}
          />
        </div>
        <div className="bg-[#161b22] p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">인기 토픽</h2>
          <div className="space-y-4">
            {sortedTopics.map((topic) => (
              <div
                key={topic.id}
                className="p-4 bg-[#1c2128] rounded-lg border border-[#30363d]"
              >
                <h3 className="font-medium text-yellow-400">{topic.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span>언급: {topic.mentionCount}회</span>
                  {topic.lastMentioned && (
                    <span>최근: {new Date(topic.lastMentioned).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 