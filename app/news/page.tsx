// src/app/page.tsx
'use client'
import { useEffect, useState } from 'react'

interface Article {
  title: string
  link: string
  pubDate: string
  source: string
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setArticles(data.articles)
      })
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-3 text-yellow-400">📡 실시간 뉴스</h2>
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