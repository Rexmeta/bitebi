'use client'

interface EmptyStateProps {
  message?: string
  icon?: string
}

export default function EmptyState({ message = '표시할 데이터가 없습니다.', icon = '📭' }: EmptyStateProps) {
  return (
    <div className="bg-gray-800/50 rounded p-8 text-gray-400 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p>{message}</p>
    </div>
  )
}
