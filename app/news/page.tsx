'use client'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import type { Article } from '../types'

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNews = async () => {
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

    fetchNews()
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스</h1>
        <LoadingSpinner message="뉴스를 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스</h1>
        <ErrorMessage message={error} />
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스</h1>
        <EmptyState message="표시할 뉴스가 없습니다." icon="📰" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-3 text-yellow-400">실시간 암호화폐 뉴스</h1>
      <p className="text-gray-400 text-sm mb-4">비트코인, 이더리움 등 주요 암호화폐 뉴스를 실시간으로 전달합니다.</p>
      <ul className="space-y-2">
        {articles.map((a, i) => (
          <li
            key={i}
            className="p-3 rounded border border-[#2d333b] hover:bg-[#2a2e35]"
          >
            <a
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="text-sm font-medium text-white leading-snug">{a.title}</div>
              <div className="text-xs text-gray-400 mt-1">{a.source} | {new Date(a.pubDate).toLocaleString()}</div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
