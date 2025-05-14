// src/app/trending/page.tsx
'use client'
import { useEffect, useState } from 'react'

interface Article {
  title: string
  link: string
  pubDate: string
  source: string
}

interface Coin {
  id: string
  symbol: string
  name: string
  market_cap_rank: number
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  image: string
}

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
  const itemsPerPage = 20

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const recentArticles = data.articles.filter((a: Article) => isRecent(a.pubDate))
          setArticles(recentArticles)
        }
      })

    fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1')
      .then(res => res.json())
      .then(data => setCoins(data))
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
        {/* 뉴스 리스트 (생략) */}
      </div>
      <div className="lg:w-1/2">
        {!selectedSymbol ? (
          <div className="bg-[#161b22] p-4 rounded border border-[#2d333b] max-h-[600px] overflow-y-scroll">
            <h3 className="text-yellow-300 font-semibold mb-3">💯 시총 TOP 100</h3>
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
                      <img src={coin.image} alt={coin.name} className="w-4 h-4" />
                      {coin.name} <span className="text-gray-400">({coin.symbol.toUpperCase()})</span>
                    </td>
                    <td className="px-2 py-1 text-right">${coin.current_price.toLocaleString()}</td>
                    <td className={`px-2 py-1 text-right ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {coin.price_change_percentage_24h.toFixed(2)}%
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
