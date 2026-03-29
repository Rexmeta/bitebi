import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '머니트래커 — 글로벌 통화량 vs 스테이블코인 모니터링',
  description: '미국, 중국, 유로존 등 주요국 M2 통화량과 스테이블코인 공급량을 실시간으로 비교 분석합니다. CBDC와 스테이블코인의 기축통화 경쟁을 추적하세요.',
  keywords: ['머니트래커', 'M2 통화량', '스테이블코인 모니터링', 'CBDC', '글로벌 통화량', '기축통화'],
  openGraph: {
    title: '머니트래커 — 글로벌 통화량 vs 스테이블코인 | Bitebi',
    description: '주요국 M2 통화량과 스테이블코인 공급량을 실시간으로 비교 분석합니다.',
    url: 'https://bitebi.vercel.app/money-tracker',
    siteName: 'Bitebi',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '머니트래커 | Bitebi',
    description: '주요국 M2 통화량과 스테이블코인 공급량을 실시간으로 비교 분석합니다.',
    creator: '@bitebi',
  },
  alternates: {
    canonical: 'https://bitebi.vercel.app/money-tracker',
  },
}

export default function MoneyTrackerLayout({ children }: { children: React.ReactNode }) {
  return children
}
