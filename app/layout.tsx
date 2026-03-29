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
  title: {
    default: 'Bitebi — 실시간 비트코인 시세, 암호화폐 뉴스 및 분석',
    template: '%s | Bitebi',
  },
  description: '비트코인 시세, 이더리움 가격, 암호화폐 뉴스, 고래 거래 추적, 스테이블코인 분석을 실시간으로 제공하는 한국어 암호화폐 정보 플랫폼',
  keywords: ['비트코인 시세', '비트코인 가격', '이더리움 가격', '암호화폐 뉴스', '코인 시세', '크립토', '블록체인', '실시간 시세', '고래 거래', '스테이블코인'],
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
    title: 'Bitebi — 실시간 비트코인 시세, 암호화폐 뉴스 및 분석',
    description: '비트코인 시세, 이더리움 가격, 암호화폐 뉴스, 고래 거래 추적을 실시간으로 제공하는 한국어 정보 플랫폼',
    siteName: 'Bitebi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitebi — 실시간 비트코인 시세, 암호화폐 뉴스 및 분석',
    description: '비트코인 시세, 이더리움 가격, 암호화폐 뉴스, 고래 거래 추적을 실시간으로 제공하는 한국어 정보 플랫폼',
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
              <div className="hidden md:flex items-center space-x-5">
                <Link href="/" className="text-gray-300 hover:text-white text-sm">
                  홈
                </Link>
                <Link href="/news" className="text-gray-300 hover:text-white text-sm">
                  뉴스
                </Link>
                <Link href="/youtube" className="text-gray-300 hover:text-white text-sm">
                  YouTube
                </Link>
                <Link href="/social" className="text-gray-300 hover:text-white text-sm">
                  소셜
                </Link>
                <Link href="/whale-tracker" className="text-gray-300 hover:text-white text-sm">
                  고래추적
                </Link>
                <Link href="/stablecoin" className="text-gray-300 hover:text-white text-sm">
                  스테이블코인
                </Link>
                <Link href="/fear-greed" className="text-gray-300 hover:text-white text-sm">
                  공포·탐욕
                </Link>
                <Link href="/money-tracker" className="text-gray-300 hover:text-white text-sm">
                  머니트래커
                </Link>
              </div>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#13161a] border-t border-[#2d333b] z-50">
          <div className="flex justify-around py-2">
            <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span className="text-lg">🏠</span>
              <span className="text-[10px]">홈</span>
            </Link>
            <Link href="/news" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span className="text-lg">📰</span>
              <span className="text-[10px]">뉴스</span>
            </Link>
            <Link href="/youtube" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span className="text-lg">🎥</span>
              <span className="text-[10px]">YouTube</span>
            </Link>
            <Link href="/social" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span className="text-lg">💬</span>
              <span className="text-[10px]">소셜</span>
            </Link>
            <Link href="/whale-tracker" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span className="text-lg">🐳</span>
              <span className="text-[10px]">고래</span>
            </Link>
            <Link href="/fear-greed" className="flex flex-col items-center text-gray-400 hover:text-yellow-400">
              <span className="text-lg">😱</span>
              <span className="text-[10px]">공포·탐욕</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  )
}