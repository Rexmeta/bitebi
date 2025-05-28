'use client'
import { useEffect, useState } from 'react'
import AdBanner from '../components/AdBanner'

interface Stablecoin {
  id: string
  symbol: string
  name: string
  market_cap_rank: number
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
  circulating_supply: number
  image: string
  description: string
  website: string
  whitepaper: string
  blockchain: string
  collateral: string
}

export default function StablecoinsPage() {
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'rank' | 'marketCap' | 'volume'>('rank')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/stablecoin')
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.details || `스테이블코인 데이터를 가져오는데 실패했습니다 (${response.status})`)
        }
        
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('스테이블코인 데이터가 없습니다')
        }
        
        console.log('Received stablecoin data:', data)
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

  const sortedStablecoins = [...stablecoins].sort((a, b) => {
    switch (sortBy) {
      case 'marketCap':
        return b.market_cap - a.market_cap
      case 'volume':
        return b.total_volume - a.total_volume
      default:
        return a.market_cap_rank - b.market_cap_rank
    }
  })

  // 로딩 컴포넌트
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
    </div>
  )

  // 에러 컴포넌트
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="bg-red-900/30 text-red-200 p-4 rounded border border-red-700 my-4">
      <p>⚠️ {message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-xs bg-red-800 hover:bg-red-700 px-3 py-1 rounded"
      >
        새로고침
      </button>
    </div>
  )

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">스테이블코인 목록</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0d1117] text-white px-3 py-1 rounded border border-[#2d333b]"
            >
              <option value="rank">시가총액 순위</option>
              <option value="marketCap">시가총액</option>
              <option value="volume">거래량</option>
            </select>
          </div>

          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161b22] border-b border-[#2d333b]">
                  <tr>
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">이름</th>
                    <th className="text-right px-4 py-2">가격</th>
                    <th className="text-right px-4 py-2">24h 변동</th>
                    <th className="text-right px-4 py-2">시가총액</th>
                    <th className="text-right px-4 py-2">24h 거래량</th>
                    <th className="text-right px-4 py-2">유통량</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStablecoins.map((coin) => (
                    <tr key={coin.id} className="border-b border-[#2d333b] hover:bg-[#2a2e35]">
                      <td className="px-4 py-3">{coin.market_cap_rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={coin.image} alt={coin.name} className="w-6 h-6" />
                          <div>
                            <div className="font-medium">{coin.name}</div>
                            <div className="text-gray-400 text-xs">{coin.symbol.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">${coin.current_price.toFixed(4)}</td>
                      <td className={`px-4 py-3 text-right ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right">${coin.market_cap.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${coin.total_volume.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">${coin.circulating_supply.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedStablecoins.map((coin) => (
                  <div key={coin.id} className="bg-[#1c2128] p-4 rounded-lg border border-[#2d333b]">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                      <div>
                        <h3 className="font-semibold">{coin.name}</h3>
                        <p className="text-gray-400 text-sm">{coin.symbol.toUpperCase()}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{coin.description}</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">블록체인:</span>
                        <span className="ml-2">{coin.blockchain}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">담보:</span>
                        <span className="ml-2">{coin.collateral}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={coin.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 text-sm"
                        >
                          웹사이트
                        </a>
                        <a
                          href={coin.whitepaper}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 text-sm"
                        >
                          백서
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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