'use client'
import React from 'react'

export default function MetricExportButtons({ metricId }: { metricId: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <a
        href={`/api/metric-data/${metricId}?format=csv`}
        className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d]"
      >
        CSV
      </a>
      <a
        href={`/api/metric-data/${metricId}?format=json`}
        className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d]"
      >
        JSON
      </a>
      <button
        onClick={() => {
          if (typeof window !== 'undefined') {
            const url = `${window.location.origin}/money-tracker/${metricId}`
            navigator.clipboard?.writeText(url)
          }
        }}
        className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d]"
      >
        링크 복사
      </button>
    </div>
  )
}
