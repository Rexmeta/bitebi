'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import EmptyState from '../components/common/EmptyState'
import type { Article, Coin } from '../types'

const coinIdMap: Record<string, string> = {
  Bitcoin: 'BTCUSDT', BTC: 'BTCUSDT',
  Ethereum: 'ETHUSDT', ETH: 'ETHUSDT',
  Solana: 'SOLUSDT', SOL: 'SOLUSDT',
  Ripple: 'XRPUSDT', XRP: 'XRPUSDT',
  Dogecoin: 'DOGEUSDT', DOGE: 'DOGEUSDT',
  Polygon: 'MATICUSDT', MATIC: 'MATICUSDT'
}

function extractCoins(title: string): string[] {
  return Object.keys(coinIdMap).filter(keyword => title.toLowerCase().includes(keyword.toLowerCase()))
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function detectIcon(title: string): string {
  const lowered = title.toLowerCase()
  if (lowered.includes('hack') || lowered.includes('exploit') || lowered.includes('security')) return '⚠️'
  if (lowered.includes('surge') || lowered.includes('soars') || lowered.includes('record high') || lowered.includes('pump')) return '🚀'
  if (lowered.includes('analysis') || lowered.includes('technical') || lowered.includes('chart')) return '📈'
  if (lowered.includes('drop') || lowered.includes('plummet') || lowered.includes('crash')) return '🔻'
  if (lowered.includes('bullish')) return '🐂'
  if (lowered.includes('bearish')) return '🐻'
  if (lowered.includes('regulation') || lowered.includes('ban')) return '⚖️'
  return '📰'
}

function isRecent(dateString: string): boolean {
  const now = new Date()
  const pubDate = new Date(dateString)
  const diff = now.getTime() - pubDate.getTime()
  return diff <= 3 * 24 * 60 * 60 * 1000
}

export default function TrendingPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [coins, setCoins] = useState<Coin[]>([])
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [mode, setMode] = useState<'all' | 'trending'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change' | 'marketCap'>('rank')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState({ articles: true, coins: true })
  const [error, setError] = useState({ articles: null as string | null, coins: null as string | null })
  const itemsPerPage = 20

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then(res => {
        if (!res.ok) throw new Error(`뉴스 데이터를 가져오는데 실패했습니다 (${res.status})`)
        return res.json()
      })
      .then(data => {
        if (data.success) {
          const recentArticles = data.articles.filter((a: Article) => isRecent(a.pubDate))
          setArticles(recentArticles)
        }
        setIsLoading(prev => ({ ...prev, articles: false }))
      })
      .catch(err => {
        console.error('뉴스 데이터 로딩 오류:', err)
        setError(prev => ({ ...prev, articles: err.message || '뉴스를 불러올 수 없습니다' }))
        setIsLoading(prev => ({ ...prev, articles: false }))
      })

    fetch('/api/coin-market')
      .then(res => {
        if (!res.ok) throw new Error(`코인 데이터를 가져오는데 실패했습니다 (${res.status})`)
        return res.json()
      })
      .then(data => {
        setCoins(data)
        setIsLoading(prev => ({ ...prev, coins: false }))
      })
      .catch(err => {
        console.error('코인 데이터 로딩 오류:', err)
        setError(prev => ({ ...prev, coins: err.message || '코인 데이터를 불러올 수 없습니다' }))
        setIsLoading(prev => ({ ...prev, coins: false }))
      })
  }, [])

  const filtered = selectedCoin
    ? articles.filter((a) => extractCoins(a.title).includes(selectedCoin))
    : articles

  const sortedTrending = [...articles].sort((a, b) => b.title.length - a.title.length).slice(0, 10)

  const sortedCoins = [...coins]
    .filter(coin => coin.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return b.current_price - a.current_price
        case 'change': return b.price_change_percentage_24h - a.price_change_percentage_24h
        case 'marketCap': return b.market_cap - a.market_cap
        default: return a.market_cap_rank - b.market_cap_rank
      }
    })

  const paginatedCoins = sortedCoins.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(sortedCoins.length / itemsPerPage)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2">
        {isLoading.articles && <LoadingSpinner message="뉴스를 불러오는 중..." />}
        {error.articles && <ErrorMessage message={error.articles} />}
        {!isLoading.articles && !error.articles && filtered.length === 0 && (
          <EmptyState message="표시할 트렌딩 뉴스가 없습니다." icon="📰" />
        )}
      </div>
      <div className="lg:w-1/2">
        {!selectedSymbol ? (
          <div className="bg-[#161b22] p-4 rounded border border-[#2d333b] max-h-[600px] overflow-y-scroll">
            <h2 className="text-yellow-300 font-semibold mb-3">암호화폐 시가총액 TOP 100</h2>
            <div className="flex justify-between items-center mb-2">
              <input
                type="text"
                placeholder="🔍 코인 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0d1117] text-white px-3 py-1 text-sm rounded border border-[#2d333b] w-1/2"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#0d1117] text-white px-2 py-1 text-sm rounded border border-[#2d333b]"
              >
                <option value="rank">Rank</option>
                <option value="price">Price</option>
                <option value="change">24h %</option>
                <option value="marketCap">Market Cap</option>
              </select>
            </div>

            {isLoading.coins && <LoadingSpinner message="코인 데이터를 불러오는 중..." />}
            {error.coins && <ErrorMessage message={error.coins} />}

            {!isLoading.coins && !error.coins && paginatedCoins.length === 0 && (
              <EmptyState message="일치하는 코인이 없습니다." icon="🪙" />
            )}

            {!isLoading.coins && !error.coins && paginatedCoins.length > 0 && (
              <>
                <table className="w-full text-sm text-white">
                  <thead className="sticky top-0 bg-[#161b22] border-b border-[#2d333b]">
                    <tr>
                      <th className="text-left px-2 py-1">#</th>
                      <th className="text-left px-2 py-1">Name</th>
                      <th className="text-right px-2 py-1">Price</th>
                      <th className="text-right px-2 py-1">24h %</th>
                      <th className="text-right px-2 py-1">Market Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCoins.map((coin) => (
                      <tr key={coin.id} className="border-b border-[#2d333b] hover:bg-[#2a2e35] cursor-pointer">
                        <td className="px-2 py-1">{coin.market_cap_rank}</td>
                        <td className="px-2 py-1 flex items-center gap-2">
                          <Image src={coin.image} alt={coin.name} width={16} height={16} className="w-4 h-4" />
                          {coin.name} <span className="text-gray-400">({coin.symbol.toUpperCase()})</span>
                        </td>
                        <td className="px-2 py-1 text-right">${coin.current_price.toLocaleString()}</td>
                        <td className={`px-2 py-1 text-right ${coin.price_change_percentage_24h !== null && coin.price_change_percentage_24h !== undefined ? (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400' : ''}`}>
                          {coin.price_change_percentage_24h !== null && coin.price_change_percentage_24h !== undefined ? coin.price_change_percentage_24h.toFixed(2) : '0.00'}%
                        </td>
                        <td className="px-2 py-1 text-right">${coin.market_cap.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-center items-center mt-4 space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`px-3 py-1 text-sm rounded border ${page === i + 1 ? 'bg-yellow-400 text-black' : 'bg-[#0d1117] text-white'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-[#161b22] p-4 rounded border border-[#2d333b]">
            <h3 className="text-yellow-300 font-semibold mb-2">{selectedCoin} 고급 차트</h3>
            <iframe
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tvchart&symbol=BINANCE:${selectedSymbol}&interval=1D&theme=dark&style=1&timezone=Asia%2FSeoul&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1&saveimage=1&toolbarbg=f1f3f6`}
              width="100%"
              height="600"
              frameBorder="0"
              allowFullScreen
              className="w-full rounded"
              title={`${selectedCoin} advanced chart`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
