import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '암호화폐 소셜 피드 — Twitter, Reddit 실시간',
  description: 'Twitter, Reddit, Medium의 암호화폐 관련 소셜 미디어 게시물을 실시간으로 모아서 보여줍니다. 커뮤니티 분위기와 트렌드를 한눈에 파악하세요.',
  keywords: ['암호화폐 소셜', '비트코인 트위터', '크립토 레딧', '코인 커뮤니티', '암호화폐 트렌드'],
  openGraph: {
    title: '암호화폐 소셜 피드 | Bitebi',
    description: 'Twitter, Reddit, Medium의 암호화폐 관련 소셜 미디어 게시물을 실시간으로 확인하세요.',
    url: 'https://bitebi.vercel.app/social',
    siteName: 'Bitebi',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '암호화폐 소셜 피드 | Bitebi',
    description: 'Twitter, Reddit, Medium의 암호화폐 관련 소셜 미디어 게시물을 실시간으로 확인하세요.',
    creator: '@bitebi',
  },
  alternates: {
    canonical: 'https://bitebi.vercel.app/social',
  },
}

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return children
}
