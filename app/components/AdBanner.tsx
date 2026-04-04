'use client'
import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// 슬롯 ID 상수 – 광고 단위별로 명확히 분리
// ─────────────────────────────────────────────
export const AD_SLOTS = {
  // ATF (Above the Fold) – 헤더 바로 아래 리더보드
  LEADERBOARD_TOP: '5844761425',

  // 콘텐츠 내부 삽입 (in-feed / in-article)
  IN_CONTENT: '9632784159',

  // 뉴스 상세 in-article (본문 중간)
  IN_ARTICLE: '3574861290',

  // 페이지 하단 마무리 광고
  FOOTER_BANNER: '5844761427',

  // 데스크탑 사이드바 Half-Page (300×600)
  SIDEBAR_HALF_PAGE: '9632784159',

  // Multiplex (콘텐츠 추천형)
  MULTIPLEX: '3574861290',

  // 모바일 앵커 (하단 스티키)
  MOBILE_ANCHOR: '5844761425',

  // 코인 상세 전용
  COIN_DETAIL_TOP: '3574861290',
} as const

export type AdSlotKey = keyof typeof AD_SLOTS

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle' | 'autorelaxed'
  style?: React.CSSProperties
  className?: string
  /** 
   * sticky: 사이드바에서 position:sticky 래퍼 적용
   * anchor: 모바일 화면 하단 고정
   */
  variant?: 'default' | 'sticky' | 'anchor' | 'multiplex'
  label?: string // "광고" 레이블 표시 여부 (기본 표시)
}

export default function AdBanner({
  slot,
  format = 'auto',
  style,
  className = '',
  variant = 'default',
  label = '광고',
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const insRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // ── 1) Intersection Observer: 실제 뷰포트에 가까워질 때 로드
  useEffect(() => {
    const el = adRef.current
    if (!el) return

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
        // 50px 전부터 미리 로드 (너무 빠른 로드 방지)
        rootMargin: '50px 0px',
        // 30% 이상 보여야 로드 → viewability 점수 향상
        threshold: 0.1,
      }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoaded])

  // ── 2) 광고 실제 초기화
  useEffect(() => {
    if (!isVisible || isLoaded) return

    const initAd = () => {
      try {
        const w = window as any
        w.adsbygoogle = w.adsbygoogle || []
        w.adsbygoogle.push({})
        setIsLoaded(true)
      } catch (err) {
        console.error('AdSense init error:', err)
      }
    }

    const w = window as any
    if (w.adsbygoogle) {
      initAd()
    } else {
      // adsbygoogle 스크립트가 아직 로드되지 않은 경우 폴링
      const timer = setInterval(() => {
        if ((window as any).adsbygoogle) {
          initAd()
          clearInterval(timer)
        }
      }, 300)
      const timeout = setTimeout(() => clearInterval(timer), 8000)
      return () => {
        clearInterval(timer)
        clearTimeout(timeout)
      }
    }
  }, [isVisible, isLoaded])

  // ── 플레이스홀더 (광고 로드 전)
  if (!isVisible) {
    return (
      <div
        ref={adRef}
        className={`ad-placeholder ${className}`}
        style={{
          minHeight: style?.minHeight || '90px',
          background: 'transparent',
          ...style,
        }}
        aria-hidden="true"
      />
    )
  }

  // ── Multiplex 포맷 (콘텐츠 추천형)
  if (variant === 'multiplex' || format === 'autorelaxed') {
    return (
      <div ref={adRef} className={`ad-multiplex-wrap ${className}`}>
        {label && (
          <p className="text-xs text-gray-600 text-center mb-1">{label}</p>
        )}
        <ins
          className="adsbygoogle"
          style={{ display: 'block', ...style }}
          data-ad-format="autorelaxed"
          data-ad-client="ca-pub-9956651639047657"
          data-ad-slot={slot}
        />
      </div>
    )
  }

  // ── Sticky (데스크탑 사이드바)
  if (variant === 'sticky') {
    return (
      <div className={`ad-sticky-wrap ${className}`} style={{ position: 'sticky', top: '80px' }}>
        {label && (
          <p className="text-xs text-gray-600 text-center mb-1">{label}</p>
        )}
        <div ref={adRef}>
          <ins
            className="adsbygoogle"
            style={{
              display: 'block',
              ...style,
            }}
            data-ad-client="ca-pub-9956651639047657"
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="false"
          />
        </div>
      </div>
    )
  }

  // ── 기본 광고 유닛
  return (
    <div ref={adRef} className={`ad-wrap ${className}`}>
      {label && (
        <p className="text-xs text-gray-600 text-center mb-1">{label}</p>
      )}
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          textAlign: 'center',
          ...style,
        }}
        data-ad-client="ca-pub-9956651639047657"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
