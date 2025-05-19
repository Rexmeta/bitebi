'use client'
import { useState } from 'react'
import WhaleTracker from '../components/WhaleTracker'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Whale Tracker - Bitebi',
  description: 'Track Bitcoin whale movements and large transactions in real-time',
}

export default function WhaleTrackerPage() {
  const [minAmount, setMinAmount] = useState(100) // 기본값 100 ETH

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">고래 트랜잭션 트래커</h1>
        <div className="flex items-center gap-4">
          <label htmlFor="minAmount" className="text-gray-400">
            최소 금액 (ETH):
          </label>
          <input
            type="number"
            id="minAmount"
            value={minAmount}
            onChange={(e) => setMinAmount(Number(e.target.value))}
            min="1"
            className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      <WhaleTracker minAmount={minAmount} />
    </div>
  )
} 