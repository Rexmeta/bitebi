'use client'

import { useEffect, useState } from 'react'
import ShareButtons from '../components/ShareButtons'
import Link from 'next/link'

interface FearGreedEntry {
  value: string
  value_classification: string
  timestamp: string
}

function getGaugeColor(value: number): string {
  if (value <= 20) return '#ea3943'
  if (value <= 40) return '#ea8c00'
  if (value <= 60) return '#f5d100'
  if (value <= 80) return '#93c47d'
  return '#16c784'
}

function getClassificationKo(classification: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': '극단적 공포',
    'Fear': '공포',
    'Neutral': '중립',
    'Greed': '탐욕',
    'Extreme Greed': '극단적 탐욕',
  }
  return map[classification] || classification
}

function GaugeChart({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90
  const color = getGaugeColor(value)

  return (
    <div className="relative w-72 h-40 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea3943" />
            <stop offset="25%" stopColor="#ea8c00" />
            <stop offset="50%" stopColor="#f5d100" />
            <stop offset="75%" stopColor="#93c47d" />
            <stop offset="100%" stopColor="#16c784" />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#2d333b"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 251.2} 251.2`}
        />
        <line
          x1="100"
          y1="100"
          x2={100 + 55 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 55 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill={color} />
        <text x="20" y="108" fill="#6e7681" fontSize="8" textAnchor="middle">0</text>
        <text x="100" y="18" fill="#6e7681" fontSize="8" textAnchor="middle">50</text>
        <text x="180" y="108" fill="#6e7681" fontSize="8" textAnchor="middle">100</text>
      </svg>
    </div>
  )
}

export default function FearGreedPage() {
  const [data, setData] = useState<FearGreedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/fear-greed')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error || '데이터를 불러올 수 없습니다')
        }
        setLoading(false)
      })
      .catch(err => {
        setError('데이터를 불러올 수 없습니다')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">공포·탐욕 지수를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">⚠️ {error || '데이터가 없습니다'}</p>
          <Link href="/" className="text-yellow-400 hover:underline">홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  const current = data[0]
  const currentValue = parseInt(current.value)
  const color = getGaugeColor(currentValue)
  const last7 = data.slice(0, 7)
  const last30 = data.slice(0, 31)

  const indicators = [
    { name: '변동성 (Volatility)', desc: '비트코인의 현재 변동성과 최대 하락폭을 30일 및 90일 평균과 비교합니다.', weight: '25%' },
    { name: '시장 모멘텀/거래량', desc: '현재 거래량과 시장 모멘텀을 30일 및 90일 평균과 비교합니다.', weight: '25%' },
    { name: 'SNS 심리', desc: '트위터, 레딧 등 소셜 미디어에서의 암호화폐 관련 게시물과 감정을 분석합니다.', weight: '15%' },
    { name: '설문조사', desc: '주간 암호화폐 투자자 설문조사 결과를 반영합니다.', weight: '15%' },
    { name: '비트코인 도미넌스', desc: '비트코인의 전체 시장 점유율 변화를 측정합니다.', weight: '10%' },
    { name: '구글 트렌드', desc: '비트코인 관련 검색어의 구글 트렌드 데이터를 분석합니다.', weight: '10%' },
  ]

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">😱 공포·탐욕 지수</h1>
          <ShareButtons
            title={`암호화폐 공포·탐욕 지수: ${currentValue} (${getClassificationKo(current.value_classification)}) - Bitebi`}
          />
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#2d333b] p-6 mb-6">
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm mb-2">현재 시장 심리</p>
            <GaugeChart value={currentValue} />
            <div className="mt-2">
              <span className="text-5xl font-bold" style={{ color }}>{currentValue}</span>
              <span className="text-gray-400 text-lg ml-1">/ 100</span>
            </div>
            <p className="text-xl mt-2 font-semibold" style={{ color }}>
              {getClassificationKo(current.value_classification)}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {new Date(parseInt(current.timestamp) * 1000).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })} 기준
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#161b22] rounded-xl border border-[#2d333b] p-4">
            <h3 className="text-yellow-400 font-semibold mb-3">📅 최근 7일 추이</h3>
            <div className="space-y-2">
              {last7.map((entry, i) => {
                const val = parseInt(entry.value)
                const barColor = getGaugeColor(val)
                const date = new Date(parseInt(entry.timestamp) * 1000)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-16 shrink-0">
                      {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-[#0d1117] rounded-full h-5 relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${val}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right" style={{ color: barColor }}>
                      {val}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-[#161b22] rounded-xl border border-[#2d333b] p-4">
            <h3 className="text-yellow-400 font-semibold mb-3">📊 최근 30일 추이</h3>
            <div className="flex items-end gap-0.5 h-40">
              {last30.reverse().map((entry, i) => {
                const val = parseInt(entry.value)
                const barColor = getGaugeColor(val)
                const date = new Date(parseInt(entry.timestamp) * 1000)
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-300 group relative"
                    style={{
                      height: `${val}%`,
                      backgroundColor: barColor,
                      minWidth: '4px',
                    }}
                    title={`${date.toLocaleDateString('ko-KR')}: ${val}`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#0d1117] text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-[#2d333b] z-10">
                      {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}: {val}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>30일 전</span>
              <span>오늘</span>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#2d333b] p-6">
          <h3 className="text-yellow-400 font-semibold mb-4">🔍 지수 산출 지표</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {indicators.map((ind) => (
              <div key={ind.name} className="bg-[#0d1117] rounded-lg p-4 border border-[#2d333b]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-white text-sm">{ind.name}</span>
                  <span className="text-yellow-400 text-xs font-bold">{ind.weight}</span>
                </div>
                <p className="text-gray-400 text-xs">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
