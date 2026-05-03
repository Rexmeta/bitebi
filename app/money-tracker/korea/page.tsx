import { Metadata } from 'next'
import Link from 'next/link'
import KoreaPulse from '../components/KoreaPulse'

export const metadata: Metadata = {
  title: 'Korea Pulse — 김치프리미엄 · 업비트/빗썸 거래대금 | 머니트래커',
  description: '김치프리미엄, 업비트·빗썸 24시간 거래대금과 점유율, KRW 마켓 상승률 상위 코인을 한 화면에서 확인하세요.',
  alternates: { canonical: 'https://bitebi.vercel.app/money-tracker/korea' },
  openGraph: {
    title: 'Korea Pulse — 머니트래커',
    description: '김치프리미엄과 한국 거래소 흐름을 한 화면에 정리합니다.',
    url: 'https://bitebi.vercel.app/money-tracker/korea',
  },
}

export default function KoreaPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/money-tracker" className="hover:text-white">머니트래커</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-200">Korea Pulse</span>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">🇰🇷 Korea Pulse</h1>
          <p className="text-sm text-gray-300 max-w-3xl">
            김치프리미엄, 업비트·빗썸 24시간 거래대금/점유율, KRW 마켓 상승률 상위 코인을 한 화면에 모았습니다.
            한국 시장 수급의 단기 과열/이완을 빠르게 진단하기 위한 섹션입니다.
          </p>
        </header>
        <KoreaPulse />
      </div>
    </div>
  )
}
