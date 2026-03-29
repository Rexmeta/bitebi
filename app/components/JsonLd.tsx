import Script from 'next/script'

export function HomeJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Bitebi",
    "url": "https://bitebi.vercel.app",
    "description": "비트코인 시세, 이더리움 가격, 암호화폐 뉴스, 고래 거래 추적을 실시간으로 제공하는 한국어 암호화폐 정보 플랫폼",
    "inLanguage": "ko",
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

export function FearGreedJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "암호화폐 공포·탐욕 지수 - bitebi",
    "description": "실시간 암호화폐 공포·탐욕 지수로 시장 심리를 확인하세요. 변동성, 거래량, SNS 심리 등 6개 지표로 산출됩니다.",
    "url": "https://bitebi.vercel.app/fear-greed",
    "isPartOf": {
      "@type": "WebSite",
      "name": "bitebi",
      "url": "https://bitebi.vercel.app"
    }
  }

  return (
    <Script id="json-ld-fear-greed" type="application/ld+json">
      {JSON.stringify(jsonLd)}
    </Script>
  )
}

export function SocialFeedJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "암호화폐 소셜 피드 — Bitebi",
    "description": "Twitter, Reddit, Medium의 실시간 암호화폐 관련 소셜 미디어 게시물을 모아서 보여줍니다.",
    "url": "https://bitebi.vercel.app/social",
    "inLanguage": "ko",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Bitebi",
      "url": "https://bitebi.vercel.app"
    }
  }

  return (
    <Script id="json-ld" type="application/ld+json">
      {JSON.stringify(jsonLd)}
    </Script>
  )
}