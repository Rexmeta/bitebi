import { Metadata } from 'next'
import CoinDetailClient from './CoinDetailClient'

const SITE_URL = 'https://bitebi.vercel.app'

const COIN_KR_NAMES: Record<string, string> = {
  bitcoin: '비트코인',
  ethereum: '이더리움',
  tether: '테더',
  binancecoin: '바이낸스코인',
  solana: '솔라나',
  ripple: '리플',
  'usd-coin': 'USD코인',
  cardano: '카르다노',
  dogecoin: '도지코인',
  'avalanche-2': '아발란체',
  polkadot: '폴카닷',
  chainlink: '체인링크',
  tron: '트론',
  'polygon-ecosystem-token': '폴리곤',
  'shiba-inu': '시바이누',
  litecoin: '라이트코인',
  'bitcoin-cash': '비트코인캐시',
  uniswap: '유니스왑',
  stellar: '스텔라',
  cosmos: '코스모스',
  monero: '모네로',
  'ethereum-classic': '이더리움클래식',
  near: '니어프로토콜',
  sui: '수이',
  aave: '에이브',
  arbitrum: '아비트럼',
  optimism: '옵티미즘',
  aptos: '앱토스',
}

async function getCoinData(id: string) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 120 },
      }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const coin = await getCoinData(id)
  const krName = COIN_KR_NAMES[id] || coin?.name || id
  const price = coin?.market_data?.current_price?.usd
  const priceStr = price ? `$${price.toLocaleString()}` : ''

  const title = `${krName} (${coin?.symbol?.toUpperCase() || id.toUpperCase()}) 실시간 시세`
  const description = `${krName} 실시간 가격 ${priceStr}, 24시간 변동률, 시가총액, 차트 및 관련 뉴스를 확인하세요. 비테비에서 ${krName}의 최신 시장 동향을 분석합니다.`

  return {
    title,
    description,
    keywords: [krName, coin?.symbol?.toUpperCase(), `${krName} 시세`, `${krName} 가격`, `${krName} 차트`, '암호화폐', '코인 시세'].filter(Boolean) as string[],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/coin/${id}`,
      siteName: 'Bitebi',
      locale: 'ko_KR',
      type: 'website',
      images: coin?.image?.large ? [{ url: coin.image.large, width: 256, height: 256, alt: krName }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      creator: '@bitebi',
    },
    alternates: {
      canonical: `${SITE_URL}/coin/${id}`,
    },
  }
}

export default async function CoinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const coin = await getCoinData(id)
  const krName = COIN_KR_NAMES[id] || coin?.name || id

  const jsonLd = coin
    ? {
        '@context': 'https://schema.org',
        '@type': 'FinancialProduct',
        name: `${krName} (${coin.symbol?.toUpperCase()})`,
        description: `${krName} 실시간 시세 및 시장 데이터`,
        url: `${SITE_URL}/coin/${id}`,
        image: coin.image?.large,
        provider: {
          '@type': 'Organization',
          name: 'Bitebi',
          url: SITE_URL,
        },
        offers: {
          '@type': 'Offer',
          price: coin.market_data?.current_price?.usd?.toString(),
          priceCurrency: 'USD',
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CoinDetailClient coinId={id} initialData={coin} krName={krName} />
    </>
  )
}
