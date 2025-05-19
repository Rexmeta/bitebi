// src/app/layout.tsx
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Bitebi - Bitcoin News & Analysis',
  description: 'Real-time Bitcoin news, market analysis, and whale tracking',
  keywords: ['비트코인', '암호화폐', '크립토', '블록체인', '뉴스', '소셜미디어', '실시간정보'],
  authors: [{ name: 'bitebi team' }],
  creator: 'bitebi',
  publisher: 'bitebi',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://bitebi.vercel.app',
    title: 'bitebi - 실시간 암호화폐 뉴스 및 소셜 피드',
    description: '비트코인과 암호화폐 관련 뉴스, 소셜 미디어 업데이트를 실시간으로 제공하는 통합 정보 플랫폼',
    siteName: 'bitebi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bitebi - 실시간 암호화폐 뉴스 및 소셜 피드',
    description: '비트코인과 암호화폐 관련 뉴스, 소셜 미디어 업데이트를 실시간으로 제공하는 통합 정보 플랫폼',
    creator: '@bitebi',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9956651639047657"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} bg-[#1b1f23] text-white min-h-screen`}>
        <header className="bg-[#161b22] border-b border-[#30363d]">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold text-yellow-400">Bitebi</span>
                </Link>
              </div>
              <div className="hidden md:flex items-center space-x-6">
                <Link href="/" className="text-gray-300 hover:text-white">
                  Home
                </Link>
                <Link href="/whale-tracker" className="text-gray-300 hover:text-white">
                  Whale Tracker
                </Link>
                <Link href="/stablecoin" className="text-gray-300 hover:text-white">
                  Stablecoin
                </Link>
                <Link href="/topics" className="text-gray-300 hover:text-white">
                  Topics
                </Link>
                <Link href="/news" className="text-gray-300 hover:text-white">
                  News
                </Link>
                <Link href="/youtube" className="text-gray-300 hover:text-white">
                  YouTube
                </Link>
                <Link href="/social" className="text-gray-300 hover:text-white">
                  Social
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        {/* 모바일 하단 네비게이션 */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#13161a] border-t border-[#2d333b]">
          <div className="flex justify-around py-2">
            <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>🏠</span>
              <span className="text-xs">Home</span>
            </Link>
            <Link href="/whale-tracker" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>🐋</span>
              <span className="text-xs">Whale</span>
            </Link>
            <Link href="/stablecoin-tracker" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>💵</span>
              <span className="text-xs">Stable</span>
            </Link>
            <Link href="/social" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>💬</span>
              <span className="text-xs">Social</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  )
}