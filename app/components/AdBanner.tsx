'use client'
import { useEffect } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal'
  style?: React.CSSProperties
}

export default function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  return (
    <div className="ad-container my-4" style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9956651639047657"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
} 