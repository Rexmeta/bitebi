'use client'
import { useEffect, useState } from 'react'
import AdBanner from '../components/AdBanner'

interface ChainVolume {
  chain: string
  volume: number
}

interface Stablecoin {
  id: string
  name: string
  symbol: string
  gecko_id: string
  pegMechanism: string
  current_price: number
  market_cap: number
  total_volume: number
  circulating_supply: number
  price_change_percentage_24h: number
  price_change_percentage_7d: number
  price_change_percentage_30d: number
  chain_volumes: ChainVolume[]
  last_updated: string
}

export default function StablecoinsPage() {
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'rank' | 'marketCap' | 'volume'>('rank')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/stablecoin')
        if (!response.ok) {
          throw new Error(`스테이블코인 데이터를 가져오는데 실패했습니다 (${response.status})`)
        }
        
        const data = await response.json()
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('스테이블코인 데이터가 없습니다')
        }
        
        setStablecoins(data)
      } catch (err) {
        console.error('스테이블코인 데이터 로딩 오류:', err)
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredStablecoins = stablecoins.filter(coin => 
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedStablecoins = [...filteredStablecoins].sort((a, b) => {
    switch (sortBy) {
      case 'marketCap':
        return b.market_cap - a.market_cap
      case 'volume':
        return b.total_volume - a.total_volume
      default:
        return a.market_cap - b.market_cap
    }
  })

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">💵 스테이블코인 시장</h1>

        <div className="mb-4">
          <AdBanner 
            slot="3574861290"
            format="horizontal"
            style={{ minHeight: '100px' }}
          />
        </div>

        <div className="bg-[#161b22] p-4 rounded border border-[#2d333b]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="w-full md:w-64">
              <input
                type="text"
                placeholder="스테이블코인 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d1117] text-white px-3 py-2 rounded border border-[#2d333b] focus:outline-none focus:border-yellow-400"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full md:w-auto bg-[#0d1117] text-white px-3 py-2 rounded border border-[#2d333b]"
            >
              <option value="rank">시가총액 순위</option>
              <option value="marketCap">시가총액</option>
              <option value="volume">거래량</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 text-red-200 p-4 rounded border border-red-700 my-4">
              <p>⚠️ {error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-xs bg-red-800 hover:bg-red-700 px-3 py-1 rounded"
              >
                새로고침
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161b22] border-b border-[#2d333b]">
                  <tr>
                    <th className="text-left px-4 py-2">이름</th>
                    <th className="text-right px-4 py-2">가격</th>
                    <th className="text-right px-4 py-2">24h 변동</th>
                    <th className="text-right px-4 py-2">7d 변동</th>
                    <th className="text-right px-4 py-2">30d 변동</th>
                    <th className="text-right px-4 py-2">시가총액</th>
                    <th className="text-right px-4 py-2">유통량</th>
                    <th className="text-right px-4 py-2">담보 방식</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStablecoins.map((coin) => (
                    <tr key={coin.id} className="border-b border-[#2d333b] hover:bg-[#2a2e35]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{coin.name}</div>
                            <div className="text-gray-400 text-xs">{coin.symbol.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{formatNumber(coin.current_price)}</td>
                      <td className={`px-4 py-3 text-right ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </td>
                      <td className={`px-4 py-3 text-right ${coin.price_change_percentage_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {coin.price_change_percentage_7d.toFixed(2)}%
                      </td>
                      <td className={`px-4 py-3 text-right ${coin.price_change_percentage_30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {coin.price_change_percentage_30d.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right">${formatLargeNumber(coin.market_cap)}</td>
                      <td className="px-4 py-3 text-right">${formatLargeNumber(coin.circulating_supply)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs bg-[#2d333b] px-2 py-1 rounded">
                          {coin.pegMechanism}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4">
          <AdBanner 
            slot="5844761427" 
            format="horizontal"
            style={{ minHeight: '100px' }}
          />
        </div>
      </div>
    </div>
  )
} 