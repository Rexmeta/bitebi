'use client'
import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
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

interface StablecoinData {
  labels: string[]
  transfers: number[]
  mints: number[]
  burns: number[]
}

const STABLECOINS = {
  USDT: {
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
  },
  USDC: {
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
  },
  DAI: {
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
  },
} as const

type StablecoinType = keyof typeof STABLECOINS

export default function StablecoinTracker() {
  const [selectedCoin, setSelectedCoin] = useState<StablecoinType>('USDT')
  const [timeframe, setTimeframe] = useState('daily')
  const [data, setData] = useState<StablecoinData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedCoin, timeframe])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stablecoin-metrics?coin=${selectedCoin}&timeframe=${timeframe}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching stablecoin data:', error)
    }
    setLoading(false)
  }

  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: 'Transfer Volume',
        data: data?.transfers || [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Mint Volume',
        data: data?.mints || [],
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1,
      },
      {
        label: 'Burn Volume',
        data: data?.burns || [],
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${STABLECOINS[selectedCoin].name} Metrics`,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return `$${(Number(value) / 1e6).toLocaleString()}M`
          }
        },
      },
    },
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Stablecoin Tracker</h1>
        
        <div className="flex items-center gap-4 mb-6">
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value as StablecoinType)}
            className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-white"
          >
            {Object.keys(STABLECOINS).map((coin) => (
              <option key={coin} value={coin}>
                {coin}
              </option>
            ))}
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : (
          <div className="bg-[#161b22] p-4 rounded-lg">
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  )
} 