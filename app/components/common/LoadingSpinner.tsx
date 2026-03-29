'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex flex-col justify-center items-center py-8">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-yellow-400`}></div>
      {message && <p className="mt-3 text-sm text-gray-400">{message}</p>}
    </div>
  )
}
