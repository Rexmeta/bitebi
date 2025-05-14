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
  const [selected, setSelected] = useState<Article | null>(null)

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setArticles(data.articles)
      })
  }, [])

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
          <div className="text-gray-400 italic">왼쪽에서 기사를 선택하세요.</div>
        )}
      </div>
    </div>
  )
}