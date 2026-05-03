import { Metadata } from 'next'
import Link from 'next/link'
import CompareTool from './CompareTool'

export const metadata: Metadata = {
  title: '비교 차트 — 두 지표 오버레이 + 상관계수 | 머니트래커',
  description: '머니트래커가 추적하는 임의의 두 지표를 오버레이하고, 피어슨 상관계수와 리드-래그를 계산해 공유 가능한 URL로 내보냅니다.',
  alternates: { canonical: 'https://bitebi.vercel.app/money-tracker/compare' },
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/money-tracker" className="hover:text-white">머니트래커</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-200">비교 차트</span>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">📊 비교 차트</h1>
          <p className="text-sm text-gray-300 max-w-3xl">
            두 개의 지표를 좌/우 축에 올려 추세를 비교하고, 피어슨 상관계수와 ±30일 리드-래그(최대 상관 시점)를 자동 계산합니다.
            URL이 자동으로 갱신되어 그대로 공유할 수 있습니다.
          </p>
        </header>
        <CompareTool />
      </div>
    </div>
  )
}
