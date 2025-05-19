'use client'
import { useEffect, useState } from 'react'
import { Alchemy, Network, BlockWithTransactions, TransactionResponse } from 'alchemy-sdk'

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: string
  blockNum: string
}

interface WhaleTrackerProps {
  minAmount: number // ETH 단위
}

const WhaleTracker = ({ minAmount }: WhaleTrackerProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWhaleTransactions = async () => {
      setLoading(true)
      setError(null)

      try {
        const config = {
          apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
          network: Network.ETH_MAINNET,
        }
        const alchemy = new Alchemy(config)

        // 최근 블록 번호 가져오기
        const latestBlock = await alchemy.core.getBlockNumber()
        
        // 최근 100개 블록의 트랜잭션 조회
        const blocks = await Promise.all(
          Array.from({ length: 100 }, (_, i) => latestBlock - i).map(blockNum =>
            alchemy.core.getBlockWithTransactions(blockNum)
          )
        )

        // 고래 트랜잭션 필터링
        const whaleTxs = blocks.flatMap((block: BlockWithTransactions) => 
          block.transactions
            .filter((tx: TransactionResponse) => 
              tx.value && 
              Number(tx.value) / 1e18 >= minAmount
            )
            .map((tx: TransactionResponse) => ({
              hash: tx.hash,
              from: tx.from,
              to: tx.to || '',
              value: (Number(tx.value) / 1e18).toFixed(2),
              timestamp: new Date(Number(block.timestamp) * 1000).toLocaleString(),
              blockNum: block.number.toString()
            }))
        )

        setTransactions(whaleTxs)
      } catch (err) {
        console.error('Error fetching whale transactions:', err)
        setError('트랜잭션을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchWhaleTransactions()
    const interval = setInterval(fetchWhaleTransactions, 60000) // 1분마다 업데이트

    return () => clearInterval(interval)
  }, [minAmount])

  if (loading) {
    return (
      <div className="bg-[#161b22] rounded-lg p-4 text-gray-400">
        트랜잭션을 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#161b22] rounded-lg p-4 text-red-400">
        {error}
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
                <td className="p-2 text-gray-400">{tx.timestamp}</td>
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
                    {`${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`}
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