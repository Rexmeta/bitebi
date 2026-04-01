'use client'
import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import AdBanner from '../components/AdBanner'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import type { StablecoinStats, StablecoinData, Article } from '../types'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS: Record<string, string> = {
  USDT: '#26A17B',
  USDC: '#2775CA',
  DAI: '#F5AC37',
  BUSD: '#F0B90B',
  TUSD: '#2B2F7E',
  USDP: '#0052FF',
  GUSD: '#00DCFA',
  FRAX: '#000000',
  PYUSD: '#0033A0',
}

const COIN_DESCRIPTIONS: Record<string, string> = {
  USDT: '테더(Tether)는 세계 최대 스테이블코인으로, 미국 달러에 1:1 페깅되어 있으며 비트파이넥스(Bitfinex)의 모회사 iFinex가 발행합니다.',
  USDC: 'USD 코인은 Circle과 Coinbase가 공동 설립한 Centre 컨소시엄이 발행하는 완전 준비금 기반 스테이블코인입니다.',
  DAI: 'DAI는 MakerDAO 프로토콜을 통해 발행되는 탈중앙화 스테이블코인으로, 암호화폐 담보를 기반으로 합니다.',
  BUSD: '바이낸스 USD는 바이낸스와 Paxos가 공동 발행하는 규제 준수 스테이블코인입니다.',
  TUSD: 'TrueUSD는 완전한 법정화폐 담보와 독립적 증명을 제공하는 투명한 스테이블코인입니다.',
  USDP: 'Pax Dollar는 Paxos Trust Company가 발행하며, 뉴욕 금융서비스국(NYDFS)의 규제를 받습니다.',
  GUSD: 'Gemini Dollar는 제미니 거래소가 발행하며, NYDFS 규제 하에 운영됩니다.',
  FRAX: 'Frax는 부분 알고리즘 기반 스테이블코인으로, 담보와 알고리즘을 혼합하여 안정성을 유지합니다.',
  PYUSD: 'PayPal USD는 PayPal이 Paxos와 협력하여 발행한 스테이블코인입니다.',
}

const COIN_CHAINS: Record<string, string[]> = {
  USDT: ['이더리움', '트론', 'BSC', '솔라나', '아발란체', '폴리곤'],
  USDC: ['이더리움', '솔라나', '아발란체', '폴리곤', 'Base', '아비트럼'],
  DAI: ['이더리움', '폴리곤', '옵티미즘', '아비트럼'],
  BUSD: ['이더리움', 'BSC'],
  TUSD: ['이더리움', '트론', 'BSC', '아발란체'],
  USDP: ['이더리움'],
  GUSD: ['이더리움'],
  FRAX: ['이더리움', '아비트럼', '옵티미즘'],
  PYUSD: ['이더리움', '솔라나'],
}

export default function StablecoinsPage() {
  const [stablecoins, setStablecoins] = useState<StablecoinStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'circulation' | 'volume' | 'change'>('circulation')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null)
  const [compareCoins, setCompareCoins] = useState<[string, string]>(['USDT', 'USDC'])
  const [showCompare, setShowCompare] = useState(false)
  const [relatedNews, setRelatedNews] = useState<Article[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/stablecoin')
        if (!response.ok) throw new Error(`스테이블코인 데이터를 가져오는데 실패했습니다 (${response.status})`)
        const data: StablecoinData = await response.json()
        setStablecoins(Object.values(data))
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.articles) {
          const filtered = data.articles.filter((a: Article) =>
            /stablecoin|usdt|usdc|tether|dai|페깅|스테이블/i.test(a.title + (a.contentSnippet || ''))
          ).slice(0, 6)
          setRelatedNews(filtered.length > 0 ? filtered : data.articles.slice(0, 4))
        }
      })
      .catch(() => {})
  }, [])

  const filteredStablecoins = stablecoins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedStablecoins = [...filteredStablecoins].sort((a, b) => {
    if (sortBy === 'volume') return b.volume - a.volume
    if (sortBy === 'change') return Math.abs(b.circulation_percent_change_24h) - Math.abs(a.circulation_percent_change_24h)
    return b.circulation - a.circulation
  })

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const totalCirculation = stablecoins.reduce((sum, c) => sum + c.circulation, 0)
  const totalVolume = stablecoins.reduce((sum, c) => sum + c.volume, 0)

  const chartOptions = {
    plugins: {
      legend: {
        position: (typeof window !== 'undefined' && window.innerWidth < 640) ? 'bottom' as const : 'right' as const,
        labels: { color: '#9ca3af', font: { size: 12 } }
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.raw || 0
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
            return `${ctx.label}: ${formatLargeNumber(val)} (${((val / total) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  }

  const chartData = {
    labels: sortedStablecoins.map(c => c.symbol),
    datasets: [{
      data: sortedStablecoins.map(c => c.circulation),
      backgroundColor: sortedStablecoins.map(c => COLORS[c.symbol] || '#6b7280'),
      borderWidth: 0,
    }]
  }

  const coinA = stablecoins.find(c => c.symbol === compareCoins[0])
  const coinB = stablecoins.find(c => c.symbol === compareCoins[1])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}시간 전`
    return `${Math.floor(hrs / 24)}일 전`
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="스테이블코인 데이터를 불러오는 중..." /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center"><ErrorMessage message={error} /></div>
  if (stablecoins.length === 0) return <div className="min-h-screen flex items-center justify-center"><EmptyState message="스테이블코인 데이터가 없습니다." icon="💰" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">스테이블코인 시장 현황</h1>
          <p className="text-gray-400 text-sm mt-1">USDT, USDC 등 주요 스테이블코인의 유통량, 거래량, 시세를 실시간 분석합니다.</p>
        </div>
        <button
          onClick={() => setShowCompare(!showCompare)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showCompare ? 'bg-yellow-400 text-black' : 'bg-[#21262d] text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/10'}`}
        >
          {showCompare ? '비교 닫기' : '코인 비교'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-[#30363d]">
          <p className="text-gray-400 text-[10px] sm:text-xs">총 유통량</p>
          <p className="text-base sm:text-xl font-bold text-white mt-1">{formatLargeNumber(totalCirculation)}</p>
        </div>
        <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-[#30363d]">
          <p className="text-gray-400 text-[10px] sm:text-xs">24시간 거래량</p>
          <p className="text-base sm:text-xl font-bold text-white mt-1">{formatLargeNumber(totalVolume)}</p>
        </div>
        <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-[#30363d]">
          <p className="text-gray-400 text-[10px] sm:text-xs">추적 코인 수</p>
          <p className="text-base sm:text-xl font-bold text-white mt-1">{stablecoins.length}개</p>
        </div>
        <div className="bg-[#161b22] rounded-xl p-3 sm:p-4 border border-[#30363d]">
          <p className="text-gray-400 text-[10px] sm:text-xs">USDT 점유율</p>
          <p className="text-base sm:text-xl font-bold text-white mt-1">
            {totalCirculation > 0 ? ((stablecoins.find(c => c.symbol === 'USDT')?.circulation || 0) / totalCirculation * 100).toFixed(1) : '-'}%
          </p>
        </div>
      </div>

      <AdBanner slot="3574861290" format="auto" style={{ minHeight: '100px' }} />

      {showCompare && coinA && coinB && (
        <div className="bg-[#161b22] rounded-xl p-4 sm:p-6 border border-[#30363d]">
          <h2 className="text-base sm:text-lg font-bold text-yellow-400 mb-4">스테이블코인 비교</h2>
          <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
            <select value={compareCoins[0]} onChange={e => setCompareCoins([e.target.value, compareCoins[1]])} className="bg-[#0d1117] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm">
              {stablecoins.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol}</option>)}
            </select>
            <span className="text-gray-400 self-center font-bold">VS</span>
            <select value={compareCoins[1]} onChange={e => setCompareCoins([compareCoins[0], e.target.value])} className="bg-[#0d1117] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm">
              {stablecoins.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="text-left py-3 text-gray-400 font-medium">항목</th>
                  <th className="text-right py-3 font-medium" style={{ color: COLORS[coinA.symbol] || '#fff' }}>{coinA.symbol}</th>
                  <th className="text-right py-3 font-medium" style={{ color: COLORS[coinB.symbol] || '#fff' }}>{coinB.symbol}</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-[#21262d]">
                  <td className="py-3 text-gray-400">유통량</td>
                  <td className="py-3 text-right">{formatLargeNumber(coinA.circulation)}</td>
                  <td className="py-3 text-right">{formatLargeNumber(coinB.circulation)}</td>
                </tr>
                <tr className="border-b border-[#21262d]">
                  <td className="py-3 text-gray-400">24시간 거래량</td>
                  <td className="py-3 text-right">{formatLargeNumber(coinA.volume)}</td>
                  <td className="py-3 text-right">{formatLargeNumber(coinB.volume)}</td>
                </tr>
                <tr className="border-b border-[#21262d]">
                  <td className="py-3 text-gray-400">현재 가격</td>
                  <td className="py-3 text-right">${coinA.price.toFixed(4)}</td>
                  <td className="py-3 text-right">${coinB.price.toFixed(4)}</td>
                </tr>
                <tr className="border-b border-[#21262d]">
                  <td className="py-3 text-gray-400">유통량 변화 (24h)</td>
                  <td className={`py-3 text-right ${coinA.circulation_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{coinA.circulation_percent_change_24h.toFixed(2)}%</td>
                  <td className={`py-3 text-right ${coinB.circulation_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{coinB.circulation_percent_change_24h.toFixed(2)}%</td>
                </tr>
                <tr className="border-b border-[#21262d]">
                  <td className="py-3 text-gray-400">거래량 변화 (24h)</td>
                  <td className={`py-3 text-right ${coinA.volume_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{coinA.volume_percent_change_24h.toFixed(2)}%</td>
                  <td className={`py-3 text-right ${coinB.volume_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{coinB.volume_percent_change_24h.toFixed(2)}%</td>
                </tr>
                <tr className="border-b border-[#21262d]">
                  <td className="py-3 text-gray-400">시장 점유율</td>
                  <td className="py-3 text-right">{(coinA.circulation / totalCirculation * 100).toFixed(1)}%</td>
                  <td className="py-3 text-right">{(coinB.circulation / totalCirculation * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-400">지원 체인</td>
                  <td className="py-3 text-right text-xs">{(COIN_CHAINS[coinA.symbol] || ['-']).join(', ')}</td>
                  <td className="py-3 text-right text-xs">{(COIN_CHAINS[coinB.symbol] || ['-']).join(', ')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-[#161b22] rounded-xl p-4 sm:p-6 border border-[#30363d]">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">유통량 기준 시장 점유율</h2>
          <div className="h-[220px] sm:h-[300px]">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 sm:p-6 border border-[#30363d]">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">24시간 거래량 기준 점유율</h2>
          <div className="h-[220px] sm:h-[300px]">
            <Pie
              data={{ ...chartData, datasets: [{ ...chartData.datasets[0], data: sortedStablecoins.map(c => c.volume) }] }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>

      <AdBanner slot="5844761427" format="auto" style={{ minHeight: '100px' }} />

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">개별 코인 현황</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="코인 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg text-sm focus:outline-none focus:border-yellow-400"
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg text-sm"
            >
              <option value="circulation">유통량순</option>
              <option value="volume">거래량순</option>
              <option value="change">변동률순</option>
            </select>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">코인</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">유통량</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">변동(24h)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 hidden sm:table-cell">가격</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 hidden sm:table-cell">거래량(24h)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">점유율</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 hidden sm:table-cell"></th>
                </tr>
              </thead>
              <tbody>
                {sortedStablecoins.map((coin, idx) => (
                  <Fragment key={coin.symbol}>
                    <tr
                      className="border-b border-[#21262d] hover:bg-[#21262d] cursor-pointer transition-colors"
                      onClick={() => setExpandedCoin(expandedCoin === coin.symbol ? null : coin.symbol)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: COLORS[coin.symbol] || '#6b7280' }}>
                            {coin.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <Link href={`/stablecoins/${coin.symbol.toLowerCase()}`} className="text-sm font-medium text-white hover:text-yellow-400" onClick={e => e.stopPropagation()}>
                              {coin.name}
                            </Link>
                            <p className="text-xs text-gray-500">{coin.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-300">{formatLargeNumber(coin.circulation)}</td>
                      <td className={`px-4 py-4 text-right text-sm ${coin.circulation_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {coin.circulation_percent_change_24h >= 0 ? '+' : ''}{coin.circulation_percent_change_24h.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-300 hidden sm:table-cell">${coin.price.toFixed(4)}</td>
                      <td className="px-4 py-4 text-right text-sm text-gray-300 hidden sm:table-cell">{formatLargeNumber(coin.volume)}</td>
                      <td className="px-4 py-4 text-right text-sm text-yellow-400">
                        {totalCirculation > 0 ? (coin.circulation / totalCirculation * 100).toFixed(1) : '-'}%
                      </td>
                      <td className="px-4 py-4 text-center text-gray-400 text-xs hidden sm:table-cell">
                        {expandedCoin === coin.symbol ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedCoin === coin.symbol && (
                      <tr key={`${coin.symbol}-detail`} className="border-b border-[#21262d]">
                        <td colSpan={7} className="px-4 py-4 bg-[#0d1117]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-yellow-400 font-medium text-sm mb-2">{coin.name} 소개</h4>
                              <p className="text-gray-400 text-sm leading-relaxed">
                                {COIN_DESCRIPTIONS[coin.symbol] || `${coin.name}(${coin.symbol})은 미국 달러에 페깅된 스테이블코인입니다.`}
                              </p>
                              <div className="mt-3">
                                <p className="text-gray-500 text-xs mb-1">지원 체인</p>
                                <div className="flex flex-wrap gap-1">
                                  {(COIN_CHAINS[coin.symbol] || ['이더리움']).map(chain => (
                                    <span key={chain} className="px-2 py-0.5 bg-[#21262d] text-gray-300 rounded text-xs">{chain}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#161b22] rounded-lg p-3 border border-[#30363d]">
                                  <p className="text-gray-500 text-xs">유통량 변화 (24h)</p>
                                  <p className={`text-sm font-medium ${coin.circulation_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {coin.circulation_change_24h >= 0 ? '+' : ''}{formatLargeNumber(Math.abs(coin.circulation_change_24h))}
                                  </p>
                                </div>
                                <div className="bg-[#161b22] rounded-lg p-3 border border-[#30363d]">
                                  <p className="text-gray-500 text-xs">거래량 변화 (24h)</p>
                                  <p className={`text-sm font-medium ${coin.volume_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {coin.volume_change_24h >= 0 ? '+' : ''}{formatLargeNumber(Math.abs(coin.volume_change_24h))}
                                  </p>
                                </div>
                                <div className="bg-[#161b22] rounded-lg p-3 border border-[#30363d]">
                                  <p className="text-gray-500 text-xs">가격 변동 (24h)</p>
                                  <p className={`text-sm font-medium ${coin.price_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {coin.price_percent_change_24h >= 0 ? '+' : ''}{coin.price_percent_change_24h.toFixed(4)}%
                                  </p>
                                </div>
                                <div className="bg-[#161b22] rounded-lg p-3 border border-[#30363d]">
                                  <p className="text-gray-500 text-xs">거래량/유통량 비율</p>
                                  <p className="text-sm font-medium text-white">
                                    {coin.circulation > 0 ? (coin.volume / coin.circulation * 100).toFixed(2) : '-'}%
                                  </p>
                                </div>
                              </div>
                              <Link
                                href={`/stablecoins/${coin.symbol.toLowerCase()}`}
                                className="block text-center py-2 bg-yellow-400 text-black rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
                              >
                                {coin.symbol} 상세 분석 보기
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(idx + 1) % 3 === 0 && idx < sortedStablecoins.length - 1 && (
                      <tr>
                        <td colSpan={7} className="p-2">
                          <AdBanner slot="3574861290" format="auto" style={{ minHeight: '80px' }} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdBanner slot="5844761427" format="auto" style={{ minHeight: '100px' }} />

      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <h2 className="text-lg font-bold text-yellow-400 mb-2">오늘의 스테이블코인 시장 요약</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          현재 스테이블코인 시장의 총 유통량은 <span className="text-white font-medium">{formatLargeNumber(totalCirculation)}</span>이며,
          24시간 거래량은 <span className="text-white font-medium">{formatLargeNumber(totalVolume)}</span>입니다.
          {stablecoins.length > 0 && (() => {
            const usdt = stablecoins.find(c => c.symbol === 'USDT')
            const usdc = stablecoins.find(c => c.symbol === 'USDC')
            if (usdt && usdc) {
              return ` USDT가 시장의 ${(usdt.circulation / totalCirculation * 100).toFixed(1)}%를 점유하며 1위를 유지하고 있고, USDC는 ${(usdc.circulation / totalCirculation * 100).toFixed(1)}%로 2위입니다.`
            }
            return ''
          })()}
          {' '}전체 {stablecoins.length}개 스테이블코인 중 유통량이 증가한 코인은{' '}
          <span className="text-green-400">{stablecoins.filter(c => c.circulation_percent_change_24h > 0).length}개</span>,
          감소한 코인은{' '}
          <span className="text-red-400">{stablecoins.filter(c => c.circulation_percent_change_24h < 0).length}개</span>입니다.
        </p>
      </div>

      {relatedNews.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-yellow-400 mb-4">스테이블코인 관련 뉴스</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedNews.map((article, i) => (
              <a
                key={i}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#161b22] rounded-xl p-4 border border-[#30363d] hover:border-yellow-400/30 transition-colors block"
              >
                <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">{article.title}</h3>
                {article.contentSnippet && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{article.contentSnippet}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-[#21262d] rounded">{article.source}</span>
                  <span>{timeAgo(article.pubDate)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <AdBanner slot="3574861290" format="auto" style={{ minHeight: '100px' }} />

      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <h2 className="text-lg font-bold text-white mb-3">데이터 수집 방법론</h2>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>Coinbase, Bitstamp, Gemini, Kraken 기반 거래량 가중 BTC/ETH 벤치마크 가격 산정</li>
          <li>BTC, ETH, USD 페어만 추적 (Bitfinex USD 페어는 USDT로 처리)</li>
          <li>BTI Exchange Rankings 기반 추적 거래소 선정</li>
          <li>약 10분마다 실시간 업데이트, 1시간마다 히스토리 스냅샷</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">데이터 소스: Ethplorer, Etherscan, Omniexplorer, Tronscan 및 등록 거래소</p>
      </div>
    </div>
  )
}
