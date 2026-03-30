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
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.1
      }
    )

    if (adRef.current) {
      observer.observe(adRef.current)
    }

    return () => observer.disconnect()
  }, [isLoaded])

  useEffect(() => {
    if (!isVisible || isLoaded) return

    const loadAd = () => {
      try {
        // @ts-ignore
        if (window.adsbygoogle) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          setIsLoaded(true)
        }
      } catch (err) {
        console.error('AdSense error:', err)
      }
    }

    if (typeof window !== 'undefined') {
      // @ts-ignore
      if (window.adsbygoogle) {
        loadAd()
      } else {
        const checkAdsbyGoogle = setInterval(() => {
          // @ts-ignore
          if (window.adsbygoogle) {
            loadAd()
            clearInterval(checkAdsbyGoogle)
          }
        }, 1000)

        setTimeout(() => clearInterval(checkAdsbyGoogle), 10000)
      }
    }
  }, [isVisible, isLoaded])

  if (!isVisible) {
    return (
      <div ref={adRef} className={className} style={{ minHeight: style?.minHeight || '100px', ...style }} />
    )
  }

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
