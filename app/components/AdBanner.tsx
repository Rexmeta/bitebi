'use client'
import { useEffect, useRef } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  style?: React.CSSProperties
  className?: string
}

export default function AdBanner({ slot, format = 'auto', style, className }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const isLoaded = useRef(false)

  useEffect(() => {
    if (isLoaded.current) return

    const loadAd = () => {
      try {
        // @ts-ignore
        if (window.adsbygoogle && adRef.current) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          isLoaded.current = true
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
  }, [])

  return (
    <div ref={adRef} className={className}>
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
    </div>
  )
} 