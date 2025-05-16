// src/app/page.tsx
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AdBanner from './components/AdBanner'
import { HomeJsonLd } from './components/JsonLd'

interface Article {
  title: string
  link: string
  pubDate: string
  source: string
  keywords?: string[]
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

function timeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function extractKeywords(title: string): string[] {
  const coinNames = ['Bitcoin', 'Ethereum', 'Solana', 'Ripple', 'Dogecoin', 'Polygon']
  return coinNames.filter(name => title.toLowerCase().includes(name.toLowerCase()))
}

export default function HomePage() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [search, setSearch] = useState('')
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change' | 'marketCap'>('rank')
  const [isLoading, setIsLoading] = useState({
    coins: true,
    articles: true
  })
  const [error, setError] = useState({
    coins: null as string | null,
    articles: null as string | null
  })

  useEffect(() => {
    // CoinGecko API 호출
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1', {
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error(`코인 데이터를 가져오는데 실패했습니다 (${res.status})`)
        return res.json()
      })
      .then(data => {
        setCoins(data)
        setIsLoading(prev => ({ ...prev, coins: false }))
        clearTimeout(timeoutId);
      })
      .catch(err => {
        console.error('코인 데이터 로딩 오류:', err)
        setError(prev => ({ ...prev, coins: err.message || '데이터를 불러올 수 없습니다' }))
        setIsLoading(prev => ({ ...prev, coins: false }))
        clearTimeout(timeoutId);
      })

    // 뉴스 API 호출
    fetch('/api/aggregate-news')
      .then(res => {
        if (!res.ok) throw new Error(`뉴스 데이터를 가져오는데 실패했습니다 (${res.status})`)
        return res.json()
      })
      .then(data => {
        if (data.success) {
          const enriched = data.articles.map((a: Article) => ({
            ...a,
            keywords: extractKeywords(a.title)
          }))
          setArticles(enriched)
        } else {
          throw new Error(data.error || '뉴스 데이터를 가져오는데 실패했습니다')
        }
        setIsLoading(prev => ({ ...prev, articles: false }))
      })
      .catch(err => {
        console.error('뉴스 데이터 로딩 오류:', err)
        setError(prev => ({ ...prev, articles: err.message || '뉴스를 불러올 수 없습니다' }))
        setIsLoading(prev => ({ ...prev, articles: false }))
      })

    // 컴포넌트 언마운트 시 타임아웃 정리
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [])

  const allKeywords = Array.from(new Set(articles.flatMap(a => a.keywords || [])))

  const filteredArticles = selectedKeyword
    ? articles.filter(a => a.keywords?.includes(selectedKeyword))
    : articles

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

  function handleCoinSelect(nameOrSymbol: string) {
    setSelectedKeyword(nameOrSymbol)
    const coin = coins.find(c => c.name.toLowerCase() === nameOrSymbol.toLowerCase() || c.symbol.toLowerCase() === nameOrSymbol.toLowerCase())
    if (coin) setSelectedSymbol(`${coin.symbol.toUpperCase()}USDT`)
  }

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
    <>
      <HomeJsonLd />
      <div className="min-h-screen bg-[#0d1117] text-white p-4">
        <main className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2">
            <h2 className="text-lg font-semibold text-yellow-400 mb-3">📰 실시간 뉴스</h2>

            <div className="mb-4">
              <AdBanner 
                slot="5844761425" 
                format="auto"
                style={{ minHeight: '100px' }}
              />
            </div>

            {allKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {allKeywords.map((keyword, idx) => (
                  <button
                    key={idx}
                    className={`px-2 py-1 rounded-full text-sm border ${selectedKeyword === keyword ? 'bg-yellow-400 text-black' : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'}`}
                    onClick={() => handleCoinSelect(keyword)}
                  >
                    #{keyword}
                  </button>
                ))}
              </div>
            )}

            {selectedKeyword && (
              <div className="mb-3">
                <span className="inline-flex items-center bg-yellow-500 text-black text-sm font-medium px-3 py-1 rounded-full">
                  keyword: {selectedKeyword}
                  <button
                    className="ml-2 text-black hover:text-white"
                    onClick={() => {
                      setSelectedKeyword(null)
                      setSelectedSymbol(null)
                    }}
                  >✕</button>
                </span>
              </div>
            )}

            {isLoading.articles && <LoadingSpinner />}
            {error.articles && <ErrorMessage message={error.articles} />}

            {!isLoading.articles && !error.articles && filteredArticles.length === 0 && (
              <div className="bg-gray-800/50 rounded p-4 text-gray-400 text-center">
                표시할 뉴스가 없습니다.
              </div>
            )}

            {!isLoading.articles && !error.articles && filteredArticles.length > 0 && (
              <div className="space-y-4">
                {filteredArticles.map((article, index) => (
                  <div key={article.link}>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-[#161b22] rounded-lg hover:bg-[#1c2128] transition-colors"
                    >
                      <h3 className="text-lg font-medium mb-2">{article.title}</h3>
                      <div className="flex items-center text-sm text-gray-400">
                        <span>{article.source}</span>
                        <span className="mx-2">•</span>
                        <span>{timeAgo(article.pubDate)}</span>
                      </div>
                    </a>
                    {(index + 1) % 3 === 0 && (
                      <div className="my-4">
                        <AdBanner 
                          slot="5844761426" 
                          format="horizontal"
                          style={{ minHeight: '100px' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:w-1/2">
            {selectedSymbol ? (
              <div className="bg-[#161b22] p-4 rounded border border-[#2d333b]">
                <h3 className="text-yellow-300 font-semibold mb-2">고급 차트</h3>

                <div className="mb-4">
                  <AdBanner 
                    slot="9632784159"
                    format="horizontal"
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <iframe
                  src={`https://s.tradingview.com/widgetembed/?frameElementId=tvchart&symbol=BINANCE:${selectedSymbol}&interval=1D&theme=dark&style=1&timezone=Asia%2FSeoul&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1&saveimage=1&toolbarbg=f1f3f6`}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  allowFullScreen
                  className="w-full rounded"
                  title={`Advanced chart for ${selectedSymbol}`}
                />
              </div>
            ) : (
              <div className="bg-[#161b22] p-4 rounded border border-[#2d333b]">
                <h3 className="text-yellow-300 font-semibold mb-3">💯 시총 TOP 100</h3>

                <div className="mb-4">
                  <AdBanner 
                    slot="3574861290"
                    format="horizontal"
                    style={{ minHeight: '100px' }}
                  />
                </div>

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

                {isLoading.coins && <LoadingSpinner />}
                {error.coins && <ErrorMessage message={error.coins} />}

                {!isLoading.coins && !error.coins && (
                  <div className="overflow-x-auto">
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
                        {sortedCoins.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-gray-400">일치하는 코인이 없습니다</td>
                          </tr>
                        ) : (
                          sortedCoins.map((coin) => (
                            <tr
                              key={coin.id}
                              className="border-b border-[#2d333b] hover:bg-[#2a2e35] cursor-pointer"
                              onClick={() => handleCoinSelect(coin.name)}
                            >
                              <td className="px-2 py-1">{coin.market_cap_rank}</td>
                              <td className="px-2 py-1 flex items-center gap-2">
                                <img src={coin.image} alt={coin.name} className="w-4 h-4" />
                                {coin.name} <span className="text-gray-400">({coin.symbol.toUpperCase()})</span>
                              </td>
                              <td className="px-2 py-1 text-right">${coin.current_price.toLocaleString()}</td>
                              <td className={`px-2 py-1 text-right ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}> {coin.price_change_percentage_24h.toFixed(2)}%</td>
                              <td className="px-2 py-1 text-right">${coin.market_cap.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4">
                  <AdBanner 
                    slot="5844761427" 
                    format="horizontal"
                    style={{ minHeight: '100px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
