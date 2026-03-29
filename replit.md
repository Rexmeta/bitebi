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
│   └── WhaleTracker.tsx # 고래 트랜잭션 추적
├── types/               # 공유 타입 정의
│   ├── index.ts         # Article, Coin, YouTubeVideo 등 공통 타입
│   ├── social.ts        # 소셜 피드 관련 타입
│   └── models/topic.ts  # 토픽 관련 타입
├── hooks/               # 커스텀 훅 (useInfiniteScroll)
├── utils/               # 유틸리티 (storage)
├── api/                 # API Routes
│   ├── coin-market/     # CoinGecko 코인 시장 데이터
│   ├── aggregate-news/  # 뉴스 집계
│   ├── social/          # 소셜 피드
│   ├── youtube/         # YouTube 영상
│   ├── stablecoin/      # 스테이블코인 데이터
│   └── stablecoins/     # 스테이블코인 목록
├── page.tsx             # 홈 (뉴스 + 시총 TOP 100)
├── news/                # 뉴스 페이지
├── youtube/             # YouTube 페이지
├── social/              # 소셜 피드 페이지
├── whale-tracker/       # 고래 트래커 페이지
├── stablecoin-tracker/  # 스테이블코인 차트
├── stablecoins/         # 스테이블코인 통계
├── trending/            # 트렌딩 페이지
├── aggregator/          # 뉴스 애그리게이터
├── money-tracker/       # 머니 트래커 대시보드
└── layout.tsx           # 루트 레이아웃 (네비게이션 포함)
```

## Running the App
```bash
npx next dev -p 5000
```
