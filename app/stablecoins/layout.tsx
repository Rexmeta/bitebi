import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '스테이블코인 시장 현황 — USDT, USDC 유통량 및 시세',
  description: 'USDT, USDC, DAI 등 주요 스테이블코인의 유통량, 거래량, 가격 변동을 실시간으로 분석합니다. 스테이블코인 시장 점유율을 한눈에 확인하세요.',
  keywords: ['스테이블코인', 'USDT', 'USDC', 'DAI', '테더', '스테이블코인 유통량', '스테이블코인 시세'],
  openGraph: {
    title: '스테이블코인 시장 현황 | Bitebi',
    description: 'USDT, USDC, DAI 등 주요 스테이블코인의 유통량, 거래량, 가격 변동을 실시간으로 분석합니다.',
    url: 'https://bitebi.vercel.app/stablecoins',
    siteName: 'Bitebi',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '스테이블코인 시장 현황 | Bitebi',
    description: 'USDT, USDC, DAI 등 주요 스테이블코인의 유통량, 거래량, 가격 변동을 실시간으로 분석합니다.',
    creator: '@bitebi',
  },
  alternates: {
    canonical: 'https://bitebi.vercel.app/stablecoins',
  },
}

export default function StablecoinsLayout({ children }: { children: React.ReactNode }) {
  return children
}
