'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdBanner, { AD_SLOTS } from '@/app/components/AdBanner'

function getLast30Days(): string[] {
  const dates: string[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default function DailyReportListPage() {
  const today = new Date().toISOString().split('T')[0]
  const dates = getLast30Days()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ATF 광고 */}
        <AdBanner slot={AD_SLOTS.LEADERBOARD_TOP} format="horizontal" style={{ minHeight: '90px' }} className="mb-6" />

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">
            📊 암호화폐 일일 시장 리포트
          </h1>
          <p className="text-gray-400">
            AI가 매일 오전 7시 최신 시장 데이터를 분석하여 리포트를 자동 생성합니다.
          </p>
        </div>

        {/* 오늘 리포트 CTA */}
        <Link
          href={`/daily-report/${today}`}
          className="block bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 mb-8 hover:from-yellow-400 hover:to-orange-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black font-bold text-lg">🔥 오늘의 시장 리포트</p>
              <p className="text-black/80 text-sm">{today} · AI 분석</p>
            </div>
            <span className="text-black font-bold text-2xl">→</span>
          </div>
        </Link>

        {/* 날짜 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {dates.map((date, i) => (
            <Link
              key={date}
              href={`/daily-report/${date}`}
              className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors"
            >
              <div>
                <p className="text-white font-medium">{date}</p>
                <p className="text-gray-400 text-sm">
                  {new Date(date).toLocaleDateString('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {i === 0 && (
                  <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">TODAY</span>
                )}
                <span className="text-gray-400">›</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 중간 광고 */}
        <AdBanner slot={AD_SLOTS.FOOTER_BANNER} format="auto" style={{ minHeight: '250px' }} className="mb-6" />

        {/* 관련 페이지 링크 */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold mb-4">📈 더 많은 분석 보기</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { href: '/fear-greed', label: '공포탐욕지수' },
              { href: '/trending', label: '트렌딩 코인' },
              { href: '/whale-tracker', label: '고래 추적' },
              { href: '/glossary', label: '코인 용어 사전' },
              { href: '/topic', label: '토픽 분석' },
              { href: '/news', label: '최신 뉴스' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-center text-sm text-gray-300 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
