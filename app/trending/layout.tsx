import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '트렌딩 암호화폐 — 실시간 인기 코인 및 뉴스',
  description: '지금 가장 주목받는 암호화폐와 트렌딩 뉴스를 실시간으로 확인하세요. 시총 TOP 100 코인의 가격 변동을 한눈에 파악합니다.',
  keywords: ['트렌딩 코인', '인기 암호화폐', '실시간 코인 순위', '코인 시세', '암호화폐 트렌드'],
  openGraph: {
    title: '트렌딩 암호화폐 | Bitebi',
    description: '지금 가장 주목받는 암호화폐와 트렌딩 뉴스를 실시간으로 확인하세요.',
    url: 'https://bitebi.vercel.app/trending',
    siteName: 'Bitebi',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '트렌딩 암호화폐 | Bitebi',
    description: '지금 가장 주목받는 암호화폐와 트렌딩 뉴스를 실시간으로 확인하세요.',
    creator: '@bitebi',
  },
  alternates: {
    canonical: 'https://bitebi.vercel.app/trending',
  },
}

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children
}
