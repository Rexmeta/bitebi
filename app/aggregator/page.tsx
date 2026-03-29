'use client'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import type { Article } from '../types'

export default function AggregatorPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const res = await fetch('/api/aggregate-news')
        if (!res.ok) {
          throw new Error(`뉴스 데이터를 가져오는데 실패했습니다 (${res.status})`)
        }

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

    fetchArticles()
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">📰 뉴스 목록</h2>
        <LoadingSpinner message="뉴스를 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">📰 뉴스 목록</h2>
        <ErrorMessage message={error} />
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">📰 뉴스 목록</h2>
        <EmptyState message="표시할 뉴스가 없습니다." icon="📰" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 border-r border-gray-300 pr-4">
        <h2 className="text-xl font-bold mb-4">📰 뉴스 목록</h2>
        <ul className="space-y-2 overflow-y-auto max-h-[70vh]">
          {articles.map((a, i) => (
            <li
              key={i}
              className={`cursor-pointer p-3 rounded border hover:bg-gray-100 ${selected?.link === a.link ? 'bg-gray-200' : ''}`}
              onClick={() => setSelected(a)}
            >
              <div className="text-sm font-semibold text-blue-700">{a.title}</div>
              <div className="text-xs text-gray-500">{a.source} | {new Date(a.pubDate).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:col-span-2">
        {selected ? (
          <div className="p-4 border bg-white rounded shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{selected.title}</h3>
            <p className="text-sm text-gray-600 mb-4">출처: {selected.source} | {new Date(selected.pubDate).toLocaleString()}</p>
            <a
              href={selected.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              원문 보기 →
            </a>
          </div>
        ) : (
          <EmptyState message="왼쪽에서 기사를 선택하세요." icon="👈" />
        )}
      </div>
    </div>
  )
}
