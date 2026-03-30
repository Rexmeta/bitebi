'use client'
import React from 'react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = '데이터를 불러올 수 없습니다', onRetry }: ErrorStateProps) {
  return (
    <div className="bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="text-gray-700 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
