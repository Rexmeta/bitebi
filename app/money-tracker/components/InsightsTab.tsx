'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { MonetaryData, FearGreedItem, Signal, StablecoinData } from '../hooks/useMoneyTrackerData'
import { UpdateTimestamp } from './UpdateTimestamp'

interface InsightsTabProps {
  monetaryData: MonetaryData | null
  fearGreedData: FearGreedItem[] | null
  stablecoinData: StablecoinData | null
  signals: Signal[]
  loading: boolean
}

export default function InsightsTab({ monetaryData, fearGreedData, stablecoinData, signals, loading }: InsightsTabProps) {
  const correlationChartRef = useRef<Chart | null>(null)
  const correlationCanvasRef = useRef<HTMLCanvasElement>(null)
  
  const sentimentChartRef = useRef<Chart | null>(null)
  const sentimentCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (correlationChartRef.current) { correlationChartRef.current.destroy(); correlationChartRef.current = null }
    if (sentimentChartRef.current) { sentimentChartRef.current.destroy(); sentimentChartRef.current = null }

    // 1. Correlation Chart: Global M2 vs Nasdaq-100
    if (correlationCanvasRef.current && monetaryData?.globalM2History && monetaryData.marketIndices?.nasdaq100History) {
      const ctx = correlationCanvasRef.current.getContext('2d')
      if (ctx) {
        const m2Hist = monetaryData.globalM2History
        const nasdaqHist = monetaryData.marketIndices.nasdaq100History
        
        // Match dates (simplified)
        const labels = m2Hist.map(d => d.date.substring(0, 7))
        const m2Data = m2Hist.map(d => d.value / 1e12) // Trillions
        const nasdaqData = nasdaqHist.slice(-m2Hist.length).map(d => d.value)

        correlationChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: '글로벌 M2 유동성 (조$)',
                data: m2Data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                yAxisID: 'y',
                tension: 0.4,
                fill: true,
              },
              {
                label: 'Nasdaq-100 지수',
                data: nasdaqData,
                borderColor: '#48bb78',
                backgroundColor: 'transparent',
                yAxisID: 'y1',
                tension: 0.4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
              y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '유동성 (T$)' } },
              y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Nasdaq' }, grid: { drawOnChartArea: false } }
            }
          }
        })
      }
    }

    // 2. Sentiment History Chart
    if (sentimentCanvasRef.current && fearGreedData && fearGreedData.length > 0) {
      const ctx = sentimentCanvasRef.current.getContext('2d')
      if (ctx) {
        const history = [...fearGreedData].reverse()
        const labels = history.map(d => {
          const date = new Date(parseInt(d.timestamp) * 1000)
          return `${date.getMonth() + 1}/${date.getDate()}`
        })
        const data = history.map(d => parseInt(d.value))

        sentimentChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: '공포/탐욕 지수',
              data,
              borderColor: '#ed8936',
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              fill: true,
              pointRadius: 0,
              tension: 0.3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { min: 0, max: 100 } }
          }
        })
      }
    }

    return () => {
      if (correlationChartRef.current) correlationChartRef.current.destroy()
      if (sentimentChartRef.current) sentimentChartRef.current.destroy()
    }
  }, [monetaryData, fearGreedData])

  if (loading && !monetaryData) return <div className="p-10 text-center text-white">금융 데이터 분석 중...</div>

  const latestFNG = fearGreedData?.[0]
  const fngValue = latestFNG ? parseInt(latestFNG.value) : 50
  const fngClass = latestFNG?.value_classification || 'Neutral'

  return (
    <div className="space-y-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Narrative Card */}
        <div className="lg:col-span-2 card bg-white/95 rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 backdrop-blur">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
            <span className="bg-indigo-100 p-2 rounded-lg">🧠</span>
            데이터 기반 시장 서사 (Market Narrative)
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p className="text-lg">
              현재 글로벌 유동성(M2)은 <b>${((monetaryData?.globalM2 || 0) / 1e12).toFixed(2)}T</b> 규모로, 
              전월 대비 {((monetaryData?.globalM2 || 0) > (monetaryData?.globalM2History?.[monetaryData.globalM2History.length-2]?.value || 0) ? '확장' : '수축')} 추세에 있습니다.
            </p>
            <div className="bg-gray-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
              <h3 className="font-bold text-indigo-700 mb-1">인사이트 요약</h3>
              <p className="text-sm">
                {fngValue < 30 
                  ? "시장에 공포가 만연해 있으나 유동성 공급은 지속되고 있습니다. 이는 우량 자산에 대한 매수 기회가 될 수 있는 '불리시 다이버전스(Bullish Divergence)' 구간입니다."
                  : fngValue > 70 
                  ? "유동성 증가세 대비 시장 참여자들의 탐욕이 과열된 상태입니다. 단기 조정 가능성에 대비한 리스크 관리가 필요한 시점입니다."
                  : "현재 유동성과 심리 지수가 중립적인 조화를 이루고 있습니다. 거시 경제 지표의 추가 변동성을 확인하며 분할 접근하는 전략이 유효합니다."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <span className="text-xs text-orange-600 font-bold uppercase">Safe Haven Asset</span>
                <div className="text-xl font-bold text-orange-800">Gold: ${(monetaryData?.marketIndices?.gold || 0).toLocaleString()}</div>
                <p className="text-xs text-orange-600 mt-1">인플레이션 헤지 수요 추이</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <span className="text-xs text-green-600 font-bold uppercase">Risk-on Asset</span>
                <div className="text-xl font-bold text-green-800">S&P 500: {(monetaryData?.marketIndices?.sp500 || 0).toLocaleString()}</div>
                <p className="text-xs text-green-600 mt-1">기관 투자자 신뢰도 지표</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Gauge Card */}
        <div className="card bg-white/95 rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 backdrop-blur flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-6 w-full text-left">🎭 대중 심리 (F&G)</h2>
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
              <circle 
                className={fngValue < 30 ? "text-red-500" : fngValue < 70 ? "text-yellow-500" : "text-green-500"} 
                strokeWidth="10" 
                strokeDasharray={251.2} 
                strokeDashoffset={251.2 - (251.2 * fngValue) / 100} 
                strokeLinecap="round" 
                stroke="currentColor" 
                fill="transparent" 
                r="40" 
                cx="50" 
                cy="50" 
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-800">{fngValue}</span>
              <span className="text-sm font-bold opacity-70">{fngClass}</span>
            </div>
          </div>
          <div className="h-32 w-full">
            <canvas ref={sentimentCanvasRef}></canvas>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Correlation Chart Card */}
        <div className="card bg-white/95 rounded-2xl p-6 sm:p-8 shadow-xl border border-white/20 backdrop-blur">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-6">
            <span className="bg-blue-100 p-2 rounded-lg">📊</span>
            유동성 vs Nasdaq-100 상관관계 분석
          </h2>
          <div className="h-[400px]">
            <canvas ref={correlationCanvasRef}></canvas>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic text-right">* 글로벌 M2(US+EU+JP+UK) 수치와 나스닥 지수의 월간 동기화 차트입니다.</p>
        </div>
      </div>
      
      <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
    </div>
  )
}
