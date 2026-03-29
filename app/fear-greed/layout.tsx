import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '공포·탐욕 지수 - Bitebi',
  description: '실시간 암호화폐 공포·탐욕 지수로 시장 심리를 확인하세요. 변동성, 거래량, SNS 심리 등 6개 지표로 산출됩니다.',
  openGraph: {
    title: '암호화폐 공포·탐욕 지수 - Bitebi',
    description: '실시간 암호화폐 공포·탐욕 지수로 시장 심리를 확인하세요.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Bitebi',
  },
  twitter: {
    card: 'summary_large_image',
    title: '암호화폐 공포·탐욕 지수 - Bitebi',
    description: '실시간 암호화폐 공포·탐욕 지수로 시장 심리를 확인하세요.',
  },
}

export default function FearGreedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
