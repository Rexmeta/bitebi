import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '고래 거래 추적기 — 대규모 암호화폐 트랜잭션 모니터링',
  description: '이더리움 고래 지갑의 대규모 트랜잭션을 실시간으로 추적합니다. 고래 거래 알림으로 시장 움직임을 미리 파악하세요.',
  keywords: ['고래 거래', '고래 추적', '대규모 트랜잭션', '이더리움 고래', '암호화폐 고래', 'whale tracker'],
  openGraph: {
    title: '고래 거래 추적기 | Bitebi',
    description: '이더리움 고래 지갑의 대규모 트랜잭션을 실시간으로 추적합니다.',
    url: 'https://bitebi.vercel.app/whale-tracker',
    siteName: 'Bitebi',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '고래 거래 추적기 | Bitebi',
    description: '이더리움 고래 지갑의 대규모 트랜잭션을 실시간으로 추적합니다.',
    creator: '@bitebi',
  },
  alternates: {
    canonical: 'https://bitebi.vercel.app/whale-tracker',
  },
}

export default function WhaleTrackerLayout({ children }: { children: React.ReactNode }) {
  return children
}
