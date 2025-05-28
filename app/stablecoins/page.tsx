'use client'
import { useEffect, useState } from 'react'
import AdBanner from '../components/AdBanner'

interface StablecoinStats {
  circulation: number
  circulation_change_24h: number
  circulation_percent_change_24h: number
  name: string
  price: number
  price_percent_change_24h: number
  symbol: string
  volume: number
  volume_change_24h: number
  volume_percent_change_24h: number
}

interface StablecoinData {
  [key: string]: StablecoinStats
}

export default function StablecoinsPage() {
  const [stablecoins, setStablecoins] = useState<StablecoinStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'circulation' | 'volume'>('circulation')
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
        
        const data: StablecoinData = await response.json()
        const stablecoinArray = Object.values(data)
        setStablecoins(stablecoinArray)
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
      case 'volume':
        return b.volume - a.volume
      default:
        return b.circulation - a.circulation
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

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Stablecoin Stats</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search stablecoins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="circulation">Circulation</option>
              <option value="volume">Volume</option>
            </select>
          </div>
        </div>

        <div className="mb-8">
          <AdBanner 
            slot="3574861290"
            format="horizontal"
            style={{ minHeight: '100px' }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg my-4">
              <p>⚠️ {error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Circulation</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change (24h)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (24h)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedStablecoins.map((coin) => (
                    <tr key={coin.symbol} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 relative bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {coin.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {coin.name}
                            </div>
                            <div className="text-sm text-gray-500">{coin.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${formatLargeNumber(coin.circulation)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${coin.circulation_percent_change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {coin.circulation_percent_change_24h.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatNumber(coin.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${formatLargeNumber(coin.volume)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Methodology</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Volume weighted BTC and ETH benchmark pricing from Coinbase, Bitstamp, Gemini, and Kraken</li>
            <li>Only BTC, ETH, and USD pairs are tracked from listed exchanges</li>
            <li>Tracked USD pairs on Bitfinex are treated as USDT</li>
            <li>Tracked exchanges determined by BTI Exchange Rankings</li>
            <li>Live updates ~10 minutes</li>
            <li>Historical snapshots every hour</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Data sources: Ethplorer, Etherscan, Omniexplorer, Tronscan, and all listed exchanges.
          </p>
        </div>

        <div className="mt-8">
          <AdBanner 
            slot="5844761427" 
            format="horizontal"
            style={{ minHeight: '100px' }}
          />
        </div>
      </div>
    </main>
  )
}