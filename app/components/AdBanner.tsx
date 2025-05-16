'use client'
import { useEffect, useRef, useState } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  style?: React.CSSProperties
  className?: string
}

export default function AdBanner({ slot, format = 'auto', style, className }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Intersection Observer 설정
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            // 광고가 보이면 observer 해제
            if (observerRef.current) {
              observerRef.current.disconnect()
            }
          }
        })
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    )

    if (adRef.current) {
      observerRef.current.observe(adRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const loadAd = () => {
      try {
        // @ts-ignore
        if (window.adsbygoogle && adRef.current) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({})
        }
      } catch (err) {
        console.error('AdSense error:', err)
      }
    }

    // AdSense가 로드되었는지 확인
    if (typeof window !== 'undefined') {
      // @ts-ignore
      if (window.adsbygoogle) {
        loadAd()
      } else {
        // AdSense가 아직 로드되지 않았다면 1초 후에 다시 시도
        setTimeout(loadAd, 1000)
      }
    }
  }, [isVisible])

  return (
    <div ref={adRef} className={className}>
      {isVisible && (
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            textAlign: 'center',
            ...style
          }}
          data-ad-client="ca-pub-9956651639047657"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      )}
    </div>
  )
} 