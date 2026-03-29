'use client'
import { useState } from 'react'
import WhaleTracker from '../components/WhaleTracker'

export default function WhaleTrackerPage() {
  const [minAmount, setMinAmount] = useState(100) // 기본값 100 ETH

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">고래 거래 추적기 — 실시간 대규모 트랜잭션 모니터링</h1>
        <p className="text-gray-400 text-sm mb-4">이더리움 고래 지갑의 대규모 거래를 실시간으로 추적합니다.</p>
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