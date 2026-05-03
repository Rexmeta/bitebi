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
│   ├── monetary/        # FRED API 미국 M2 통화량 + 금리 (FRED_API_KEY 필요)
│   ├── defi-stats/      # DefiLlama + CoinGecko 통합 (TVL, 스테이블코인, BTC 가격)
│   ├── aggregate-news/  # 뉴스 집계
│   ├── social/          # 소셜 피드
│   ├── youtube/         # YouTube 영상
│   ├── stablecoin/      # 스테이블코인 데이터
│   └── stablecoins/     # DefiLlama+CoinGecko 스테이블코인 상세 데이터
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
├── money-tracker/       # 머니 트래커 대시보드 (실시간 API 연동, 컴포넌트 분리)
│   ├── components/      # OverviewTab, CoreKpiGrid, KoreaPulse, Watchlist, SignalHistoryPanel, MoneySupplyTab, MetricsTab, MacroTab, AnalysisTab, ApisTab, SkeletonCard, ErrorState, UpdateTimestamp
│   ├── hooks/           # useMoneyTrackerData (통합 데이터 fetching + 자동 새로고침 + 신호 생성)
│   ├── [metric]/        # 지표별 SEO 단독 페이지 (/money-tracker/<metric-id>) — KPI 카드, 차트, 정의/계산식, 임베드 코드, 관련 지표
│   ├── korea/           # Korea Pulse: 김치프리미엄 + 업비트/빗썸 거래대금/점유율 + KRW 마켓 상승률
│   └── compare/         # 두 지표 오버레이 + 피어슨 + 리드-래그 비교 차트 (URL 공유 가능)
├── embed/[metric]/      # 외부 사이트 임베드용 경량 차트 (iframe 친화)
├── fear-greed/          # 공포·탐욕 지수 페이지 (게이지 차트, 7/30일 추이, OG 이미지)
├── opengraph-image.tsx  # 동적 OG 이미지 (홈, BTC/ETH 실시간 가격 포함)
└── layout.tsx           # 루트 레이아웃 (네비게이션 포함)
```

## Environment Variables
- `ALCHEMY_API_KEY` — Alchemy SDK API key for whale transaction tracking (server-side only)
- `FRED_API_KEY` — (Optional) FRED API key for US M2 money supply and Federal Funds Rate data. Free at https://fred.stlouisfed.org/docs/api/api_key.html
- `RESEND_API_KEY` — (Optional) Resend API key used by `/api/watchlist-cron` to send threshold-breach emails. When unset, email dispatch is silently skipped.
- `RESEND_FROM` — (Optional) Verified Resend sender, e.g. `Bitebi Alerts <alerts@yourdomain.com>`. Defaults to `Bitebi Alerts <alerts@bitebi.app>`.
- `TELEGRAM_BOT_TOKEN` — (Optional) Telegram bot token (BotFather) used by `/api/watchlist-cron` to send messages. When unset, Telegram dispatch is silently skipped.
- `CRON_SECRET` — (Optional but recommended) Shared secret required as `?secret=…` or `Authorization: Bearer …` on `/api/watchlist-cron`. When unset the route is open (dev only).

## API Caching
- `coin-market` route: 60-second in-memory cache for CoinGecko data, with stale-data fallback on errors
- `aggregate-news` route: 60-second in-memory cache, parallel Promise.allSettled fetching, auto-category assignment, contentSnippet extraction, 100 article limit
- `fear-greed` route: 5-minute in-memory cache for Alternative.me Fear & Greed Index
- `market-summary` route: 2-minute in-memory cache for CoinGecko Global data
- `whale-tracker` route: 30-second in-memory cache for Alchemy whale transactions
- `youtube` route: 5-minute in-memory cache per channel, parallel Promise.all fetching, pagination support (page/limit params), language/category/channelId query filters
- `monetary` route: SWR persistent cache (memory + disk via `lib/persistentCache.ts`) for FRED M2 + Federal Funds Rate. Stale entries are served instantly while a background revalidation runs, so cold-start hits return last-known data in <1s.
- `defi-stats` route: SWR persistent cache for DefiLlama stablecoins, chains, TVL + CoinGecko BTC price
- `stablecoins` route: SWR persistent cache for DefiLlama + CoinGecko stablecoin data with fallback
- `fear-greed` route: SWR persistent cache for Alternative.me Fear & Greed Index
- Persistent cache files are written under `.cache/api-responses/<key>.json` (override via `PERSISTENT_CACHE_DIR`). They survive process restarts so the next cold start does not re-pay the 5–15s external-API tax.
- `derivatives` route: 2-minute cache for Binance Futures OI/funding (BTC/ETH) + 30-day OI history; liquidations approximated when no public feed
- `etf-flows` route: 30-minute cache for SoSoValue spot BTC/ETH ETF historical net inflows (estimated fallback when upstream unavailable)
- `exchange-flows` route: 10-minute cache; stablecoin daily delta from DefiLlama, BTC/ETH netflow currently synthetic until labelled-wallet feed is added (`estimated:true`)
- `onchain-cohorts` route: 1-hour cache; CoinGecko-derived MVRV/SOPR/realized-price/LTH-share proxies (clearly marked `estimated:true`)
- `korea` route: 2-minute cache combining Upbit ticker, Bithumb 24h volume, Coinbase BTC-USD, exchangerate.host USD/KRW (kimchi premium + market share)
- `metric-data/[id]` route: thin wrapper around the metric registry returning `{current, history, source, formula}` JSON or `text/csv`
- `signals` route: GET returns file-backed signal history + 30/90 day BTC return backtest; POST appends current signals (no-ops on read-only filesystems)

## Money Tracker Conventions
- Central metric registry at `lib/metrics.ts` — every metric has id, title, category, unit, description, formula, source, apiPath, selector, optional history selector. Used by `[metric]` page, `embed/[metric]` page, `compare` tool, and the `metric-data` export endpoint.
- 6-block KPI grid (`CoreKpiGrid`) replaces the legacy overview hero on mobile (horizontal swipe) and desktop (3×2 grid). Each card shows current value, 30-day sparkline, and 1D/7D/30D/YTD chips, and links to the SEO detail page.
- Signal history is persisted at `data/signal-history.json`; `lib/signalHistory.ts` exposes `loadSignalHistory`, `recordSignals`, `backtestSignals`. Backtest pulls 365 days of CoinGecko BTC daily prices and computes +30/+90 day returns from each signal's first-seen date.
- Watchlist + threshold alerts use browser `localStorage` (`mt_watchlist_v1`) and the Notification API for foreground UX, and are also synced to the backend via a lightweight device token (`mt_device_token_v1`). Server records are persisted at `data/watchlists.json` (`lib/watchlistStore.ts`). The cron-style route `GET /api/watchlist-cron` (intended to be hit every ~5 min by Replit Scheduled Deployments / GitHub Actions) evaluates every watched item, dispatches email via Resend (`lib/notify.ts → sendEmail`) and Telegram via the Bot API (`sendTelegram`), and applies a 6-hour per-(token,metric) cooldown to avoid spam. Authorization via `CRON_SECRET` (query `?secret=` or `Authorization: Bearer`).
- Watchlist API: `GET/POST/DELETE /api/watchlist`, all requiring an `x-device-token` header (16–128 char URL-safe). POST body accepts `{ items, email, telegramChatId }` and validates each item against `lib/metrics.ts`.
- Compare tool (`/money-tracker/compare?a=...&b=...`) computes Pearson correlation and best ±30 day lead-lag and writes selections to the URL for sharing.
- `lib/analytics.ts` exposes `trackEvent(name, params)` that forwards to GA4 (`gtag`) and GTM `dataLayer`. Used by KPI grid card clicks and the export buttons.

## Development Notes
- Webpack `watchOptions.ignored` is configured to exclude `.local`, `.git`, and `node_modules` to prevent continuous recompilation in the Replit environment
- `allowedDevOrigins` is set for Replit proxy domains
- First page load in dev mode is slower due to on-demand route compilation

## Running the App
```bash
npx next dev -p 5000
```
