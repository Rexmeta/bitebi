import { useEffect, useCallback } from 'react'

export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean
) {
  const handleScroll = useCallback(() => {
    if (!hasMore) return

    const scrollTop = window.scrollY
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      callback()
    }
  }, [callback, hasMore])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
} 