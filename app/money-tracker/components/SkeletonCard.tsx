'use client'
import React from 'react'

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur animate-pulse ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gray-300 rounded-lg" />
        <div className="h-6 bg-gray-300 rounded w-32" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-200 rounded-lg p-4">
            <div className="h-6 bg-gray-300 rounded w-16 mx-auto mb-2" />
            <div className="h-3 bg-gray-300 rounded w-20 mx-auto" />
          </div>
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-lg" />
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-gray-300 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-16 mx-auto mb-2" />
      <div className="h-3 bg-gray-300 rounded w-20 mx-auto" />
    </div>
  )
}
