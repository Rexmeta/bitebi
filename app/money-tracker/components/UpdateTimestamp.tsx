'use client'
import React from 'react'

interface UpdateTimestampProps {
  timestamp: string | null
}

export function UpdateTimestamp({ timestamp }: UpdateTimestampProps) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  const formatted = date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <span className="text-xs text-gray-400 ml-2">
      {formatted} 기준
    </span>
  )
}
