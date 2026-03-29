import { Metadata } from 'next'

const COIN_META: Record<string, { name: string; desc: string }> = {
  usdt: { name: '테더(USDT)', desc: 'USDT 테더의 실시간 유통량, 가격, 거래량, 준비금 정보, 리스크 분석을 확인하세요.' },
  usdc: { name: 'USD Coin(USDC)', desc: 'USDC의 실시간 유통량, 가격, 거래량, Circle 준비금 정보, 감사 현황을 확인하세요.' },
  dai: { name: 'DAI', desc: 'MakerDAO DAI의 실시간 유통량, 담보 비율, 거래량, 탈중앙화 리스크 분석을 확인하세요.' },
  busd: { name: '바이낸스 USD(BUSD)', desc: 'BUSD의 실시간 유통량, 가격, 거래량 현황을 확인하세요.' },
  tusd: { name: 'TrueUSD(TUSD)', desc: 'TUSD의 실시간 유통량, 가격, 거래량, 준비금 증명 현황을 확인하세요.' },
  usdp: { name: 'Pax Dollar(USDP)', desc: 'USDP의 실시간 유통량, 가격, NYDFS 규제 현황을 확인하세요.' },
  gusd: { name: 'Gemini Dollar(GUSD)', desc: 'GUSD의 실시간 유통량, 가격, 거래량 현황을 확인하세요.' },
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params
  const meta = COIN_META[symbol] || { name: symbol.toUpperCase(), desc: `${symbol.toUpperCase()} 스테이블코인의 실시간 시세, 유통량, 거래량을 확인하세요.` }

  return {
    title: `${meta.name} 실시간 시세 및 분석 — 유통량, 거래량, 리스크 | Bitebi`,
    description: meta.desc,
    keywords: [meta.name, symbol.toUpperCase(), '스테이블코인', '유통량', '거래량', '시세', '암호화폐'],
    openGraph: {
      title: `${meta.name} 실시간 분석 | Bitebi`,
      description: meta.desc,
      url: `https://bitebi.vercel.app/stablecoins/${symbol}`,
      siteName: 'Bitebi',
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${meta.name} 실시간 분석 | Bitebi`,
      description: meta.desc,
    },
    alternates: {
      canonical: `https://bitebi.vercel.app/stablecoins/${symbol}`,
    },
  }
}

export default function StablecoinDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
