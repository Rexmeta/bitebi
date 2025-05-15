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
      <body className={`${inter.className} bg-[#1b1f23] text-white`}>
        <header className="bg-[#13161a] sticky top-0 z-50 border-b border-[#2d333b]">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl font-bold text-yellow-400">bitebi</h1>
              <nav className="space-x-6 text-sm">
                <Link href="/" className="hover:text-yellow-400">홈</Link>
                <Link href="/news" className="hover:text-yellow-400">뉴스</Link>
                <Link href="/social" className="hover:text-yellow-400">소셜</Link>
                <Link href="/aggregator" className="hover:text-yellow-400">전체 뉴스</Link>
              </nav>
            </div>
            
            <div className="flex items-center justify-end space-x-4 text-xs text-gray-400">
              <Link 
                href="/social?platform=twitter" 
                className="hover:text-blue-400 transition-colors"
              >
                𝕏 Twitter
              </Link>
              <Link 
                href="/social?platform=reddit" 
                className="hover:text-orange-500 transition-colors"
              >
                📱 Reddit
              </Link>
              <Link 
                href="/social?platform=telegram" 
                className="hover:text-blue-500 transition-colors"
              >
                ✈️ Telegram
              </Link>
              <Link 
                href="/social?filter=trending" 
                className="hover:text-yellow-400 transition-colors"
              >
                🔥 트렌딩
              </Link>
              <Link 
                href="/social?filter=bookmarks" 
                className="hover:text-yellow-400 transition-colors"
              >
                🔖 북마크
              </Link>
            </div>
          </div>
        </header>
        <main className="w-full px-4 pt-6 pb-20">
          {children}
        </main>
      </body>
    </html>
  )
}