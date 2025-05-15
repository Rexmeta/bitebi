// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'bitebi - Crypto News Aggregator',
  description: '비트코인 및 암호화폐 뉴스를 실시간으로 모아보는 중국어권 정보 허브',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9956651639047657"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} bg-[#1b1f23] text-white min-h-screen`}>
        <header className="bg-[#13161a] sticky top-0 z-50 border-b border-[#2d333b]">
          <nav className="max-w-7xl mx-auto">
            {/* 메인 네비게이션 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d333b]">
              <Link href="/" className="text-xl font-bold text-yellow-400">
                bitebi
              </Link>
              <div className="flex items-center space-x-6 text-sm">
                <Link href="/" className="hover:text-yellow-400 transition-colors">홈</Link>
                <Link href="/news" className="hover:text-yellow-400 transition-colors">뉴스</Link>
                <Link href="/social" className="hover:text-yellow-400 transition-colors">소셜</Link>
                <Link href="/aggregator" className="hover:text-yellow-400 transition-colors">전체 뉴스</Link>
              </div>
            </div>
            
            {/* SNS 서브 네비게이션 */}
            <div className="px-4 py-2 flex items-center justify-end space-x-6 text-sm bg-[#1c2128]">
              <Link 
                href="/social?platform=twitter" 
                className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors"
              >
                <span>𝕏</span>
                <span>Twitter</span>
              </Link>
              <Link 
                href="/social?platform=reddit" 
                className="flex items-center space-x-1 text-gray-400 hover:text-orange-500 transition-colors"
              >
                <span>📱</span>
                <span>Reddit</span>
              </Link>
              <Link 
                href="/social?platform=telegram" 
                className="flex items-center space-x-1 text-gray-400 hover:text-blue-500 transition-colors"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </Link>
              <div className="h-4 w-px bg-[#2d333b]"></div>
              <Link 
                href="/social?filter=trending" 
                className="flex items-center space-x-1 text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <span>🔥</span>
                <span>트렌딩</span>
              </Link>
              <Link 
                href="/social?filter=bookmarks" 
                className="flex items-center space-x-1 text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <span>🔖</span>
                <span>북마크</span>
              </Link>
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
              <span className="text-xs">홈</span>
            </Link>
            <Link href="/news" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>📰</span>
              <span className="text-xs">뉴스</span>
            </Link>
            <Link href="/social" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>💬</span>
              <span className="text-xs">소셜</span>
            </Link>
            <Link href="/social?filter=bookmarks" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span>🔖</span>
              <span className="text-xs">북마크</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  )
}