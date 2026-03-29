'use client'
import { useEffect, useState, useCallback } from 'react'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'
import EmptyState from './common/EmptyState'

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: string
  blockNum: string
}

interface WhaleTrackerProps {
  minAmount: number
}

const WhaleTracker = ({ minAmount }: WhaleTrackerProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWhaleTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/whale-tracker?minAmount=${minAmount}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '서버 오류가 발생했습니다.')
      }
      const data: Transaction[] = await res.json()
      setTransactions(data)
    } catch (err) {
      console.error('Error fetching whale transactions:', err)
      setError(err instanceof Error ? err.message : '트랜잭션을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [minAmount])

  useEffect(() => {
    fetchWhaleTransactions()
    const interval = setInterval(fetchWhaleTransactions, 60000)
    return () => clearInterval(interval)
  }, [fetchWhaleTransactions])

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-[#161b22] rounded-lg p-8">
        <LoadingSpinner message="트랜잭션을 불러오는 중..." />
      </div>
    )
  }

  if (error && transactions.length === 0) {
    return (
      <div className="bg-[#161b22] rounded-lg p-4">
        <ErrorMessage message={error} onRetry={fetchWhaleTransactions} />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-[#161b22] rounded-lg p-4">
        <EmptyState message={`${minAmount} ETH 이상의 트랜잭션이 없습니다.`} />
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] rounded-lg p-4">
      <h2 className="text-xl font-semibold text-yellow-400 mb-4">
        고래 트랜잭션 트래커 ({minAmount} ETH 이상)
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 border-b border-[#30363d]">
              <th className="p-2">시간</th>
              <th className="p-2">블록</th>
              <th className="p-2">보낸 주소</th>
              <th className="p-2">받는 주소</th>
              <th className="p-2">금액 (ETH)</th>
              <th className="p-2">트랜잭션</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.hash} className="border-b border-[#30363d] hover:bg-[#1b1f23]">
                <td className="p-2 text-gray-400">{new Date(tx.timestamp).toLocaleString()}</td>
                <td className="p-2 text-gray-400">{tx.blockNum}</td>
                <td className="p-2">
                  <a
                    href={`https://etherscan.io/address/${tx.from}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {`${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`}
                  </a>
                </td>
                <td className="p-2">
                  <a
                    href={`https://etherscan.io/address/${tx.to}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : '-'}
                  </a>
                </td>
                <td className="p-2 text-green-400">{tx.value} ETH</td>
                <td className="p-2">
                  <a
                    href={`https://etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    상세보기
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WhaleTracker
