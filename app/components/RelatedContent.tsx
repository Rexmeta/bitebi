'use client'
import Link from 'next/link'

interface RelatedLink {
  href: string
  title: string
  description: string
  icon: string
}

interface RelatedContentProps {
  links: RelatedLink[]
}

const ALL_PAGES: RelatedLink[] = [
  { href: '/', title: '홈', description: '실시간 암호화폐 시세 및 뉴스', icon: '🏠' },
  { href: '/news', title: '뉴스', description: '최신 암호화폐 뉴스 모아보기', icon: '📰' },
  { href: '/fear-greed', title: '공포·탐욕 지수', description: '시장 심리 분석 지표', icon: '😱' },
  { href: '/trending', title: '트렌딩', description: '지금 뜨는 암호화폐 소식', icon: '🔥' },
  { href: '/youtube', title: 'YouTube', description: '최신 비트코인 영상 모음', icon: '🎥' },
  { href: '/whale-tracker', title: '고래 추적', description: '대규모 거래 실시간 모니터링', icon: '🐋' },
  { href: '/money-tracker', title: '머니 트래커', description: '글로벌 통화량 모니터링', icon: '💰' },
  { href: '/stablecoin-tracker', title: '스테이블코인 트래커', description: '스테이블코인 시장 지표', icon: '💵' },
  { href: '/social', title: '소셜 피드', description: '암호화폐 소셜 미디어 모음', icon: '💬' },
]

export default function RelatedContent({ links }: RelatedContentProps) {
  return (
    <div className="mt-8 bg-[#161b22] rounded-xl border border-[#2d333b] p-6">
      <h3 className="text-lg font-semibold text-yellow-400 mb-4">이런 콘텐츠도 확인해보세요</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 p-3 rounded-lg bg-[#0d1117] border border-[#2d333b] hover:border-yellow-400/50 transition-colors"
          >
            <span className="text-2xl">{link.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{link.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function getRelatedLinks(currentPath: string, extraLinks?: RelatedLink[]): RelatedLink[] {
  const filtered = ALL_PAGES.filter((page) => page.href !== currentPath)
  if (extraLinks) {
    const extraHrefs = new Set(extraLinks.map((l) => l.href))
    const remaining = filtered.filter((page) => !extraHrefs.has(page.href))
    return [...extraLinks.filter((l) => l.href !== currentPath), ...remaining].slice(0, 6)
  }
  return filtered.slice(0, 4)
}
