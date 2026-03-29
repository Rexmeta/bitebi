'use client'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const handleRetry = onRetry || (() => window.location.reload())

  return (
    <div className="bg-red-900/30 text-red-200 p-4 rounded border border-red-700 my-4">
      <p className="mb-2">{message}</p>
      <button
        onClick={handleRetry}
        className="text-xs bg-red-800 hover:bg-red-700 px-3 py-1 rounded transition-colors"
      >
        새로고침
      </button>
    </div>
  )
}
