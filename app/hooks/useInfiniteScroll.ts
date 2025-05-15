import { useEffect, useCallback } from 'react'

export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean
) {
  const handleScroll = useCallback(() => {
    if (!hasMore) return

    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    if (windowHeight + scrollTop >= documentHeight - 1000) {
      callback()
    }
  }, [callback, hasMore])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
} 