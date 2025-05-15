import Script from 'next/script'

export function HomeJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "bitebi",
    "url": "https://bitebi.vercel.app",
    "description": "비트코인과 암호화폐 관련 뉴스, 소셜 미디어 업데이트를 실시간으로 제공하는 통합 정보 플랫폼",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://bitebi.vercel.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <Script id="json-ld" type="application/ld+json">
      {JSON.stringify(jsonLd)}
    </Script>
  )
}

export function SocialFeedJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "암호화폐 소셜 피드 - bitebi",
    "description": "Twitter, Reddit, Telegram의 실시간 암호화폐 관련 소셜 미디어 업데이트",
    "url": "https://bitebi.vercel.app/social",
    "isPartOf": {
      "@type": "WebSite",
      "name": "bitebi",
      "url": "https://bitebi.vercel.app"
    }
  }

  return (
    <Script id="json-ld" type="application/ld+json">
      {JSON.stringify(jsonLd)}
    </Script>
  )
} 