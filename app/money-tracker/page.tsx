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
import ApisTab from './components/ApisTab'
import { ErrorState } from './components/ErrorState'

const TABS = [
  { key: 'overview', label: '개요' },
  { key: 'money-supply', label: '전세계 통화량' },
  { key: 'metrics', label: '핵심 지표' },
  { key: 'macro', label: '매크로 연동' },
  { key: 'analysis', label: '분석 방법' },
  { key: 'apis', label: '데이터 소스' },
]

const MoneyTrackerPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [darkMode, setDarkMode] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const {
    stablecoinData,
    monetaryData,
    defiStats,
    loading,
    error,
    lastFetchTime,
    signals,
    refetch,
  } = useMoneyTrackerData()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1': setActiveTab('overview'); break
          case '2': setActiveTab('money-supply'); break
          case '3': setActiveTab('metrics'); break
          case '4': setActiveTab('macro'); break
          case '5': setActiveTab('analysis'); break
          case '6': setActiveTab('apis'); break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', closeMenu)
      return () => window.removeEventListener('click', closeMenu)
    }
  }, [contextMenu])

  function notify(message: string, type: string = 'info') {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const contextMenuItems = [
    { text: '새로고침', action: () => { refetch(); notify('데이터를 새로고침합니다.', 'success') } },
    { text: '다크모드 토글', action: () => setDarkMode(d => !d) },
    { text: '전체화면', action: () => document.documentElement.requestFullscreen && document.documentElement.requestFullscreen() },
  ]

  const renderTabContent = () => {
    if (error && !stablecoinData && !monetaryData && !defiStats) {
      return <ErrorState message={error} onRetry={refetch} />
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab stablecoinData={stablecoinData} defiStats={defiStats} loading={loading} signals={signals} onRetry={refetch} />
      case 'money-supply':
        return <MoneySupplyTab stablecoinData={stablecoinData} monetaryData={monetaryData} defiStats={defiStats} loading={loading} onRetry={refetch} />
      case 'metrics':
        return <MetricsTab defiStats={defiStats} stablecoinData={stablecoinData} loading={loading} onRetry={refetch} />
      case 'macro':
        return <MacroTab monetaryData={monetaryData} defiStats={defiStats} stablecoinData={stablecoinData} signals={signals} loading={loading} onRetry={refetch} />
      case 'analysis':
        return <AnalysisTab />
      case 'apis':
        return <ApisTab />
      default:
        return null
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const lastUpdateFormatted = lastFetchTime
    ? new Date(lastFetchTime).toLocaleString('ko-KR')
    : ''

  return (
    <div
      className={`relative min-h-screen ${darkMode ? 'dark-mode' : ''}`}
      onContextMenu={handleContextMenu}
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="max-w-[1400px] mx-auto py-6 px-2 md:px-6 container">
        <div className="text-center text-white mb-10 py-10 header">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow">🌐 스테이블코인 기축통화 모니터링</h1>
          <p className="text-lg opacity-90">실시간 데이터로 분석하는 글로벌 금융 시스템의 변화</p>
          {loading && (
            <div className="mt-2 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 text-sm">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              데이터 갱신 중...
            </div>
          )}
        </div>
        <div className="mb-6">
          <AdBanner slot="5844761425" format="horizontal" style={{ minHeight: '90px' }} />
        </div>
        <div className="flex bg-white/10 rounded-xl mb-6 overflow-x-auto tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`flex-1 py-3 px-4 md:px-6 text-center text-sm md:text-base font-semibold transition-colors rounded-lg whitespace-nowrap ${activeTab === tab.key ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-[400px] sm:min-h-[600px]">{renderTabContent()}</div>
        <div className="my-6">
          <AdBanner slot="9632784159" format="auto" style={{ minHeight: '100px' }} />
        </div>
        <div className="text-center text-white/80 text-sm mt-10">
          마지막 업데이트: <span>{lastUpdateFormatted}</span>
          {!loading && (
            <button
              onClick={() => { refetch(); notify('데이터를 새로고침합니다.', 'success') }}
              className="ml-3 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition text-xs"
            >
              🔄 새로고침
            </button>
          )}
        </div>
        <div className="my-6">
          <AdBanner slot="5844761427" format="horizontal" style={{ minHeight: '90px' }} />
        </div>
        <RelatedContent links={getRelatedLinks('/money-tracker')} />
      </div>
      {notification && (
        <div
          className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-lg shadow-lg text-white`}
          style={{
            background: notification.type === 'success' ? '#48bb78' : notification.type === 'warning' ? '#ed8936' : '#4299e1',
            animation: 'slideIn 0.3s ease',
          }}
        >
          {notification.message}
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x, minWidth: 150 }}
        >
          {contextMenuItems.map((item) => (
            <div
              key={item.text}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-800"
              onClick={() => {
                item.action()
                setContextMenu(null)
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MoneyTrackerPage
