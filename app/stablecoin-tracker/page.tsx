'use client'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface StablecoinMetric {
  timestamp: string
  totalSupply: number
  marketCap: number
  volume24h: number
}

export default function StablecoinTrackerPage() {
  const [metrics, setMetrics] = useState<StablecoinMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/stablecoin-metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        setError('스테이블코인 데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000) // 5분마다 업데이트
    return () => clearInterval(interval)
  }, [])

  const chartData = {
    labels: metrics.map(m => new Date(m.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: '총 공급량 (USD)',
        data: metrics.map(m => m.totalSupply),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: '시가총액 (USD)',
        data: metrics.map(m => m.marketCap),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: '24시간 거래량 (USD)',
        data: metrics.map(m => m.volume24h),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '스테이블코인 시장 지표'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString()
          }
        }
      }
    }
  }

  if (loading) return <div className="text-center py-8">로딩 중...</div>
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">스테이블코인 트래커</h1>
      
      <div className="bg-[#161b22] p-6 rounded-lg">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-[#161b22] p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">총 공급량</h3>
          <p className="text-2xl text-yellow-400">
            ${metrics[metrics.length - 1]?.totalSupply.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="bg-[#161b22] p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">시가총액</h3>
          <p className="text-2xl text-yellow-400">
            ${metrics[metrics.length - 1]?.marketCap.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="bg-[#161b22] p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">24시간 거래량</h3>
          <p className="text-2xl text-yellow-400">
            ${metrics[metrics.length - 1]?.volume24h.toLocaleString() ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
} 