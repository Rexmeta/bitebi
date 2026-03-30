# Bitebi - 실시간 암호화폐 뉴스 및 분석 플랫폼

## Overview
Next.js 15 기반 암호화폐 정보 통합 플랫폼. 실시간 뉴스, 코인 시장 데이터, 소셜 미디어 피드, 고래 트래커, 스테이블코인 분석 등을 제공.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Chart.js + react-chartjs-2
- **PWA**: next-pwa
- **Blockchain**: Alchemy SDK (이더리움 고래 트래킹)
- **Ads**: Google AdSense

## Project Structure
```
app/
├── components/
│   ├── common/          # 공통 UI 컴포넌트 (LoadingSpinner, ErrorMessage, EmptyState, CoinImage)
│   ├── AdBanner.tsx     # 광고 배너
│   ├── JsonLd.tsx       # SEO 구조화 데이터
│   ├── ShareButtons.tsx # SNS 공유 버튼 (X, 카카오톡, 텔레그램, 링크복사)
│   ├── MarketSummaryCard.tsx # 일일 시장 요약 카드
│   └── WhaleTracker.tsx # 고래 트랜잭션 추적
├── types/               # 공유 타입 정의
│   ├── index.ts         # Article, Coin, YouTubeVideo 등 공통 타입
│   ├── social.ts        # 소셜 피드 관련 타입
│   └── models/topic.ts  # 토픽 관련 타입
├── hooks/               # 커스텀 훅 (useInfiniteScroll)
├── utils/               # 유틸리티 (storage)
├── api/                 # API Routes
│   ├── coin-market/     # CoinGecko 코인 시장 데이터
│   ├── fear-greed/      # 공포·탐욕 지수 API (Alternative.me)
│   ├── market-summary/  # 글로벌 시장 요약 API (CoinGecko Global)
│   ├── aggregate-news/  # 뉴스 집계
│   ├── social/          # 소셜 피드
│   ├── youtube/         # YouTube 영상
│   ├── stablecoin/      # 스테이블코인 데이터
│   └── stablecoins/     # 스테이블코인 목록
├── sitemap.ts           # 동적 sitemap.xml 생성
├── robots.ts            # robots.txt 생성
├── page.tsx             # 홈 (뉴스 + 시총 TOP 100)
├── coin/[id]/           # 개별 코인 상세 페이지 (SSR, JSON-LD)
├── news/                # 뉴스 페이지 (카테고리 탭, 시간/소스 필터, 검색, 인기 기사)
│   └── [slug]/          # 뉴스 상세 페이지 (기사 미리보기, 관련 기사, 브레드크럼)
├── youtube/             # YouTube 큐레이션 페이지 (한국어/영어 탭, 카테고리 필터, 채널 필터, 하이라이트, 무한스크롤, 인라인 재생)
├── social/              # 소셜 피드 페이지 (layout.tsx 메타데이터 포함)
├── whale-tracker/       # 고래 트래커 페이지 (layout.tsx 메타데이터 포함)
├── stablecoin-tracker/  # 스테이블코인 차트
├── stablecoins/         # 스테이블코인 시장 현황 (비교 도구, 뉴스 연동, 일일 요약)
│   └── [symbol]/        # 개별 코인 상세 (소개, 리스크 분석, 체인, SEO 메타데이터)
├── trending/            # 트렌딩 페이지 (layout.tsx 메타데이터 포함)
├── aggregator/          # 뉴스 애그리게이터
├── money-tracker/       # 머니 트래커 대시보드 (layout.tsx 메타데이터 포함)
├── fear-greed/          # 공포·탐욕 지수 페이지 (게이지 차트, 7/30일 추이, OG 이미지)
├── opengraph-image.tsx  # 동적 OG 이미지 (홈, BTC/ETH 실시간 가격 포함)
└── layout.tsx           # 루트 레이아웃 (네비게이션 포함)
```

## Environment Variables
- `ALCHEMY_API_KEY` — Alchemy SDK API key for whale transaction tracking (server-side only)

## API Caching
- `coin-market` route: 60-second in-memory cache for CoinGecko data, with stale-data fallback on errors
- `aggregate-news` route: 60-second in-memory cache, parallel Promise.allSettled fetching, auto-category assignment, contentSnippet extraction, 100 article limit
- `fear-greed` route: 5-minute in-memory cache for Alternative.me Fear & Greed Index
- `market-summary` route: 2-minute in-memory cache for CoinGecko Global data
- `whale-tracker` route: 30-second in-memory cache for Alchemy whale transactions
- `youtube` route: 5-minute in-memory cache per channel, parallel Promise.all fetching, pagination support (page/limit params), language/category/channelId query filters

## Development Notes
- Webpack `watchOptions.ignored` is configured to exclude `.local`, `.git`, and `node_modules` to prevent continuous recompilation in the Replit environment
- `allowedDevOrigins` is set for Replit proxy domains
- First page load in dev mode is slower due to on-demand route compilation

## Running the App
```bash
npx next dev -p 5000
```
