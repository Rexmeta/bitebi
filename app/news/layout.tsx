import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '실시간 암호화폐 뉴스 — 비트코인, 이더리움 최신 소식',
  description: '비트코인, 이더리움 등 암호화폐 관련 최신 뉴스를 실시간으로 확인하세요. 글로벌 크립토 뉴스를 한국어로 빠르게 전달합니다.',
  keywords: ['암호화폐 뉴스', '비트코인 뉴스', '이더리움 뉴스', '크립토 뉴스', '코인 뉴스', '실시간 뉴스'],
  openGraph: {
    title: '실시간 암호화폐 뉴스 | Bitebi',
    description: '비트코인, 이더리움 등 암호화폐 관련 최신 뉴스를 실시간으로 확인하세요.',
    url: 'https://bitebi.vercel.app/news',
    siteName: 'Bitebi',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '실시간 암호화폐 뉴스 | Bitebi',
    description: '비트코인, 이더리움 등 암호화폐 관련 최신 뉴스를 실시간으로 확인하세요.',
    creator: '@bitebi',
  },
  alternates: {
    canonical: 'https://bitebi.vercel.app/news',
  },
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
