'use client'
import React, { useEffect, useState } from 'react'
import AdBanner from '../components/AdBanner'
import RelatedContent, { getRelatedLinks } from '../components/RelatedContent'
import { useMoneyTrackerData } from './hooks/useMoneyTrackerData'
import OverviewTab from './components/OverviewTab'
import MoneySupplyTab from './components/MoneySupplyTab'
import MetricsTab from './components/MetricsTab'
import MacroTab from './components/MacroTab'
import AnalysisTab from './components/AnalysisTab'
import InsightsTab from './components/InsightsTab'
import { ErrorState } from './components/ErrorState'

const TABS = [
  { key: 'overview',      label: '📊 개요',        shortLabel: '개요' },
  { key: 'insights',      label: '🧠 인사이트',    shortLabel: '인사이트' },
  { key: 'money-supply',  label: '🌐 통화량',       shortLabel: '통화량' },
  { key: 'metrics',       label: '📈 핵심 지표',    shortLabel: '지표' },
  { key: 'macro',         label: '🔗 매크로',       shortLabel: '매크로' },
  { key: 'analysis',      label: '🔬 분석',         shortLabel: '분석' },
]

const MoneyTrackerPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null)

  const {
    stablecoinData,
    monetaryData,
    defiStats,
    fearGreedData,
    loading,
    error,
    lastFetchTime,
    signals,
    refetch,
  } = useMoneyTrackerData()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const map: Record<string, string> = {
          '1': 'overview', '2': 'insights', '3': 'money-supply',
          '4': 'metrics',  '5': 'macro',    '6': 'analysis',
        }
        if (map[e.key]) setActiveTab(map[e.key])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function notify(message: string, type: string = 'info') {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const renderTabContent = () => {
    if (error && !stablecoinData && !monetaryData && !defiStats) {
      return <ErrorState message={error} onRetry={refetch} />
    }
    switch (activeTab) {
      case 'overview':     return <OverviewTab stablecoinData={stablecoinData} monetaryData={monetaryData} defiStats={defiStats} loading={loading} signals={signals} onRetry={refetch} />
      case 'insights':     return <InsightsTab monetaryData={monetaryData} fearGreedData={fearGreedData} stablecoinData={stablecoinData} signals={signals} loading={loading} />
      case 'money-supply': return <MoneySupplyTab stablecoinData={stablecoinData} monetaryData={monetaryData} defiStats={defiStats} loading={loading} onRetry={refetch} />
      case 'metrics':      return <MetricsTab defiStats={defiStats} stablecoinData={stablecoinData} loading={loading} onRetry={refetch} />
      case 'macro':        return <MacroTab monetaryData={monetaryData} defiStats={defiStats} stablecoinData={stablecoinData} signals={signals} loading={loading} onRetry={refetch} />
      case 'analysis':     return <AnalysisTab />
      default:             return null
    }
  }

  // ── KPI 요약값 계산 ───────────────────────────────────────────
  const totalStable = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const currentTvl  = defiStats?.currentTvl || 0
  const globalM2    = monetaryData?.globalM2 || 0
  const fedRate     = monetaryData?.fedFundsRate
  const fngValue    = fearGreedData?.[0] ? parseInt(fearGreedData[0].value) : null
  const fngLabel    = fearGreedData?.[0]?.value_classification || ''

  const fngColor = fngValue === null ? 'text-gray-400'
    : fngValue < 25  ? 'text-red-400'
    : fngValue < 45  ? 'text-orange-400'
    : fngValue < 55  ? 'text-yellow-400'
    : fngValue < 75  ? 'text-green-400'
    : 'text-emerald-300'

  const positiveSignals = signals.filter(s => s.type === 'positive').length
  const dangerSignals   = signals.filter(s => s.type === 'danger').length
  const marketSentiment = dangerSignals > 1 ? 'Bearish' : positiveSignals >= 2 ? 'Bullish' : 'Neutral'
  const sentimentColor  = marketSentiment === 'Bullish' ? 'text-emerald-400'
    : marketSentiment === 'Bearish' ? 'text-red-400' : 'text-yellow-400'
  const sentimentBg     = marketSentiment === 'Bullish' ? 'bg-emerald-400/10 border-emerald-400/30'
    : marketSentiment === 'Bearish' ? 'bg-red-400/10 border-red-400/30' : 'bg-yellow-400/10 border-yellow-400/30'

  const lastUpdateFormatted = lastFetchTime
    ? new Date(lastFetchTime).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-'

  const monetaryDiagnostics = monetaryData?.diagnostics
  const dataCompleteness = monetaryDiagnostics?.completeness ?? null
  const dataSource = monetaryDiagnostics?.source ?? (monetaryData?.hasFredKey ? 'fred' : 'fallback')
  const sourceLabel = dataSource === 'fred' ? 'FRED' : dataSource === 'hybrid' ? 'HYBRID' : 'FALLBACK'
  const missingSeries = monetaryDiagnostics?.missing || []
  const seriesLabelMap: Record<string, string> = {
    usM2: '미국 M2',
    fedFunds: '연준 금리',
    globalM2: '글로벌 M2',
    regionalM2: '지역별 M2',
    sp500: 'S&P 500',
    nasdaq100: 'Nasdaq-100',
    gold: 'Gold',
  }
  const completenessColor = dataCompleteness == null
    ? 'text-gray-400'
    : dataCompleteness >= 90
      ? 'text-emerald-400'
      : dataCompleteness >= 70
        ? 'text-yellow-400'
        : 'text-red-400'

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-white">

      {/* ── 상단 헤더 ──────────────────────────────────── */}
      <div className="border-b border-[#21262d] bg-[#161b22]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">

          {/* 타이틀 행 */}
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">M</div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-white leading-tight">머니트래커</h1>
                <p className="text-xs text-gray-400 hidden sm:block">글로벌 유동성 · 온체인 인텔리전스</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  업데이트 중
                </span>
              )}
              {!loading && lastFetchTime && (
                <span className="text-xs text-gray-500">{lastUpdateFormatted}</span>
              )}
              <button
                onClick={() => { refetch(); notify('데이터를 새로고침합니다.', 'success') }}
                className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] transition text-gray-400 hover:text-white"
                title="새로고침"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* KPI 요약 바 */}
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pb-2 scrollbar-none text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">스테이블 총량</span>
              <span className="font-bold text-white">{totalStable > 0 ? `$${(totalStable/1e9).toFixed(0)}B` : '-'}</span>
            </div>
            <div className="w-px h-3 bg-[#30363d]" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">DeFi TVL</span>
              <span className="font-bold text-white">{currentTvl > 0 ? `$${(currentTvl/1e9).toFixed(1)}B` : '-'}</span>
            </div>
            <div className="w-px h-3 bg-[#30363d]" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">글로벌 M2</span>
              <span className="font-bold text-white">{globalM2 > 0 ? `$${(globalM2/1e12).toFixed(2)}T` : '-'}</span>
            </div>
            <div className="w-px h-3 bg-[#30363d]" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">연준 금리</span>
              <span className="font-bold text-white">{fedRate !== null && fedRate !== undefined ? `${fedRate}%` : '-'}</span>
            </div>
            <div className="w-px h-3 bg-[#30363d]" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">공포/탐욕</span>
              <span className={`font-bold ${fngColor}`}>{fngValue !== null ? `${fngValue} (${fngLabel})` : '-'}</span>
            </div>
            <div className="w-px h-3 bg-[#30363d]" />
            <div className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border ${sentimentBg}`}>
              <span className="text-gray-400">시장</span>
              <span className={`font-bold ${sentimentColor}`}>{marketSentiment}</span>
            </div>
            <div className="w-px h-3 bg-[#30363d]" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">데이터 완전성</span>
              <span className={`font-bold ${completenessColor}`}>
                {dataCompleteness != null ? `${dataCompleteness}%` : '-'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#30363d] text-gray-400">
                {sourceLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 광고 ──────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-4">
        <AdBanner slot="5844761425" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      {/* ── 탭 네비게이션 ─────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-4">
        <div className="flex gap-0.5 bg-[#161b22] border border-[#21262d] rounded-xl p-1 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-[#21262d] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262d]/50'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 부분 실패/추정치 안내 ─────────────────────────────── */}
      {missingSeries.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-3">
          <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 md:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs md:text-sm text-amber-300 font-semibold mb-1">
                  일부 지표가 지연되어 추정치/대체 데이터가 사용 중입니다.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {missingSeries.map((key) => (
                    <span key={key} className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-200 bg-amber-400/10">
                      {seriesLabelMap[key] || key}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { refetch(); notify('누락 지표를 재조회합니다.', 'success') }}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 transition"
              >
                다시 조회
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 탭 콘텐츠 ─────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 min-h-[500px]">
        {renderTabContent()}
      </div>

      {/* ── 하단 광고 & 관련링크 ──────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-8">
        <AdBanner slot="9632784159" format="auto" style={{ minHeight: '100px' }} />
        <div className="mt-6">
          <AdBanner slot="5844761427" format="horizontal" style={{ minHeight: '90px' }} />
        </div>
        <div className="mt-6">
          <RelatedContent links={getRelatedLinks('/money-tracker')} />
        </div>
      </div>

      {/* ── 알림 토스트 ───────────────────────────────── */}
      {notification && (
        <div
          className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2"
          style={{
            background: notification.type === 'success' ? '#10b981' : '#3b82f6',
          }}
        >
          {notification.type === 'success' ? '✓' : 'ℹ'} {notification.message}
        </div>
      )}
    </div>
  )
}

export default MoneyTrackerPage
