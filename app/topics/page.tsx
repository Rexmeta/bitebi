'use client'
import { useState } from 'react'
import { topicCategories } from '../data/topics'
import { Topic } from '../types/topic'

export default function TopicsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'trending' | 'mentions' | 'recent'>('trending')

  const filteredTopics = topicCategories
    .filter(category => selectedCategory === 'all' || category.id === selectedCategory)
    .flatMap(category => category.topics)
    .sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return a.trending === 'up' ? -1 : b.trending === 'up' ? 1 : 0
        case 'mentions':
          return b.mentionCount - a.mentionCount
        case 'recent':
          return b.lastMentioned.getTime() - a.lastMentioned.getTime()
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">토픽 맵</h1>
        
        {/* 필터 및 정렬 옵션 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2"
          >
            <option value="all">전체 카테고리</option>
            {topicCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2"
          >
            <option value="trending">트렌딩 순</option>
            <option value="mentions">언급 순</option>
            <option value="recent">최신 순</option>
          </select>
        </div>

        {/* 토픽 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((topic: Topic) => (
            <div
              key={topic.id}
              className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-yellow-400 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-yellow-400">{topic.name}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  topic.trending === 'up' ? 'bg-green-900 text-green-400' :
                  topic.trending === 'down' ? 'bg-red-900 text-red-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {topic.trending === 'up' ? '상승' : topic.trending === 'down' ? '하락' : '중립'}
                </span>
              </div>
              <p className="text-gray-400 mb-3">{topic.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>언급: {topic.mentionCount}</span>
                <span>최근: {topic.lastMentioned.toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 