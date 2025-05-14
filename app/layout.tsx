// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

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
      <head />
      <body className={`${inter.className} bg-[#1b1f23] text-white`}>
        <header className="bg-[#13161a] sticky top-0 z-50 border-b border-[#2d333b]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-yellow-400">bitebi</h1>
            <nav className="space-x-6 text-sm">
              <Link href="/" className="hover:text-yellow-400">홈</Link>
              <Link href="/news" className="hover:text-yellow-400">뉴스</Link>
              <Link href="/aggregator" className="hover:text-yellow-400">전체 뉴스</Link>
            </nav>
          </div>
        </header>
        <main className="w-full px-4 pt-6 pb-20">
          {children}
        </main>
      </body>
    </html>
  )
}