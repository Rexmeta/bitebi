'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

interface Props {
  history: { date: string; value: number }[]
  unit: string
}

export default function MetricChart({ history, unit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    if (!canvasRef.current || !history.length) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.map((p) => p.date),
        datasets: [{
          label: unit,
          data: history.map((p) => p.value),
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129,140,248,0.10)',
          tension: 0.35,
          fill: true,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
        },
        scales: {
          y: { ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
          x: { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [history, unit])

  if (!history.length) {
    return <div className="flex items-center justify-center h-full text-gray-500 text-sm">데이터를 불러오는 중...</div>
  }
  return <canvas ref={canvasRef} />
}
