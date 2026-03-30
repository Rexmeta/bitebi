'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AdBanner from '../../components/AdBanner'
import RelatedContent, { getRelatedLinks } from '../../components/RelatedContent'
import type { Article } from '../../types'

interface CoinDetailData {
  id: string
  symbol: string
  name: string
  image: { large: string; small: string; thumb: string }
  market_data: {
    current_price: { usd: number; krw: number }
    price_change_percentage_24h: number
    price_change_percentage_7d: number
    price_change_percentage_30d: number
    market_cap: { usd: number }
    market_cap_rank: number
    total_volume: { usd: number }
    circulating_supply: number
    total_supply: number | null
    max_supply: number | null
    high_24h: { usd: number }
    low_24h: { usd: number }
    ath: { usd: number }
    ath_change_percentage: { usd: number }
  }
  description: { en: string; ko?: string }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  return `$${num.toLocaleString()}`
}

function formatSupply(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  return num.toLocaleString()
}

function PriceChange({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-gray-400">-</span>
  const color = value >= 0 ? 'text-green-400' : 'text-red-400'
  const arrow = value >= 0 ? '+' : ''
  return <span className={color}>{arrow}{value.toFixed(2)}%</span>
}

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  solana: 'SOLUSDT',
  ripple: 'XRPUSDT',
  dogecoin: 'DOGEUSDT',
  cardano: 'ADAUSDT',
  'avalanche-2': 'AVAXUSDT',
  polkadot: 'DOTUSDT',
  chainlink: 'LINKUSDT',
  litecoin: 'LTCUSDT',
  'polygon-ecosystem-token': 'POLUSDT',
  'shiba-inu': 'SHIBUSDT',
  'bitcoin-cash': 'BCHUSDT',
  uniswap: 'UNIUSDT',
  stellar: 'XLMUSDT',
  cosmos: 'ATOMUSDT',
  tron: 'TRXUSDT',
  near: 'NEARUSDT',
  sui: 'SUIUSDT',
  aave: 'AAVEUSDT',
  arbitrum: 'ARBUSDT',
  optimism: 'OPUSDT',
  aptos: 'APTUSDT',
  binancecoin: 'BNBUSDT',
}

export default function CoinDetailClient({
  coinId,
  initialData,
  krName,
}: {
  coinId: string
  initialData: CoinDetailData | null
  krName: string
}) {
  const [coin] = useState<CoinDetailData | null>(initialData)
  const [relatedNews, setRelatedNews] = useState<Article[]>([])
  const [newsLoading, setNewsLoading] = useState(true)

  const tradingSymbol = SYMBOL_MAP[coinId] || `${coin?.symbol?.toUpperCase() || ''}USDT`

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const coinName = coin?.name?.toLowerCase() || ''
          const symbol = coin?.symbol?.toLowerCase() || ''
          const filtered = data.articles
            .filter((a: Article) => {
              const title = a.title.toLowerCase()
              return title.includes(coinName) || title.includes(symbol) || title.includes(krName)
            })
            .slice(0, 10)
          setRelatedNews(filtered)
        }
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }, [coin, krName])

  if (!coin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">코인 데이터를 불러올 수 없습니다.</p>
          <Link href="/" className="text-yellow-400 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const md = coin.market_data

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="mb-4">
        <Link href="/" className="text-gray-400 hover:text-yellow-400 text-sm">
          &larr; 홈으로 돌아가기
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {coin.image?.large && (
          <Image
            src={coin.image.large}
            alt={krName}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">
            {krName} ({coin.symbol.toUpperCase()}) 실시간 시세
          </h1>
          <p className="text-gray-400 text-sm">시가총액 순위 #{md.market_cap_rank}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#161b22] rounded-lg p-6 border border-[#2d333b]">
          <h2 className="text-lg font-semibold text-yellow-300 mb-4">{krName} 가격 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">현재 가격</span>
              <span className="text-xl font-bold">${md.current_price.usd.toLocaleString()}</span>
            </div>
            {md.current_price.krw && (
              <div className="flex justify-between">
                <span className="text-gray-400">원화 가격</span>
                <span className="font-semibold">{md.current_price.krw.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">24시간 변동률</span>
              <PriceChange value={md.price_change_percentage_24h} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">7일 변동률</span>
              <PriceChange value={md.price_change_percentage_7d} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">30일 변동률</span>
              <PriceChange value={md.price_change_percentage_30d} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24시간 최고</span>
              <span>${md.high_24h?.usd?.toLocaleString() || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24시간 최저</span>
              <span>${md.low_24h?.usd?.toLocaleString() || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-lg p-6 border border-[#2d333b]">
          <h2 className="text-lg font-semibold text-yellow-300 mb-4">{krName} 시장 데이터</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">시가총액</span>
              <span>{formatNumber(md.market_cap.usd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24시간 거래량</span>
              <span>{formatNumber(md.total_volume.usd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">유통량</span>
              <span>{formatSupply(md.circulating_supply)}</span>
            </div>
            {md.total_supply && (
              <div className="flex justify-between">
                <span className="text-gray-400">총 공급량</span>
                <span>{formatSupply(md.total_supply)}</span>
              </div>
            )}
            {md.max_supply && (
              <div className="flex justify-between">
                <span className="text-gray-400">최대 공급량</span>
                <span>{formatSupply(md.max_supply)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">역대 최고가 (ATH)</span>
              <span>${md.ath?.usd?.toLocaleString() || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ATH 대비</span>
              <PriceChange value={md.ath_change_percentage?.usd} />
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-lg p-6 border border-[#2d333b]">
          <h2 className="text-lg font-semibold text-yellow-300 mb-4">{krName} 관련 뉴스</h2>
          {newsLoading ? (
            <p className="text-gray-400 text-sm">뉴스를 불러오는 중...</p>
          ) : relatedNews.length === 0 ? (
            <p className="text-gray-400 text-sm">관련 뉴스가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {relatedNews.map((article, i) => (
                <li key={i}>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-[#1c2128] rounded p-2 -mx-2 transition-colors"
                  >
                    <p className="text-sm text-white leading-snug line-clamp-2">{article.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{article.source}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="my-6">
        <AdBanner slot="5844761425" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      <div className="bg-[#161b22] rounded-lg p-4 border border-[#2d333b] mb-8">
        <h2 className="text-lg font-semibold text-yellow-300 mb-3">{krName} 실시간 차트</h2>
        <iframe
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tvchart&symbol=BINANCE:${tradingSymbol}&interval=1D&theme=dark&style=1&timezone=Asia%2FSeoul&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1&saveimage=1&toolbarbg=f1f3f6`}
          width="100%"
          height="500"
          frameBorder="0"
          allowFullScreen
          className="w-full rounded"
          title={`${krName} 실시간 차트`}
        />
      </div>

      <div className="my-6">
        <AdBanner slot="9632784159" format="auto" style={{ minHeight: '100px' }} />
      </div>

      {coin.description?.en && (
        <div className="bg-[#161b22] rounded-lg p-6 border border-[#2d333b]">
          <h2 className="text-lg font-semibold text-yellow-300 mb-3">{krName} 소개</h2>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {stripHtml(coin.description.ko || coin.description.en)}
          </p>
        </div>
      )}

      <div className="my-6">
        <AdBanner slot="5844761427" format="horizontal" style={{ minHeight: '90px' }} />
      </div>

      <RelatedContent links={getRelatedLinks(`/coin/${coinId}`, [
        { href: '/news', title: '관련 뉴스', description: '최신 암호화폐 뉴스 모아보기', icon: '📰' },
        { href: '/fear-greed', title: '공포·탐욕 지수', description: '시장 심리 분석', icon: '😱' },
      ])} />
    </div>
  )
}
