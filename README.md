This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI 설정 (Gemini)

이 프로젝트의 AI 생성 경로는 Gemini API를 사용하도록 구성되어 있습니다.

### 1) 환경변수

로컬 개발(`.env.local`)과 Vercel 프로젝트 환경변수에 아래 값을 설정하세요.

```bash
GEMINI_API_KEY=your_google_ai_studio_key

GEMINI_MODEL=gemini-2.5-flash-lite
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_MANUAL_ADS=false
```

- `GEMINI_API_KEY`는 필수입니다.
- `GEMINI_MODEL` 미설정 시 기본값은 `gemini-2.5-flash-lite`입니다.
- `NEXT_PUBLIC_MANUAL_ADS=false`이면 수동 광고 슬롯은 렌더링하지 않고(빈 공간 제거), 애드센스 자동 광고만 사용합니다.


### 2) Vercel에서 설정 방법

1. Vercel Dashboard → 프로젝트 선택  
2. **Settings → Environment Variables** 이동  
3. 아래 키를 `Production`, `Preview`, `Development`에 추가
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (선택)
   - `NEXT_PUBLIC_SITE_URL`

   - `NEXT_PUBLIC_MANUAL_ADS` (`false` 권장: 자동 광고만 사용)

4. 저장 후 **Redeploy**

### 3) 뉴스 생성 경로 (단일화)

- API 엔드포인트: `/api/generate-news`
- 내부 흐름:
  1. `lib/generateNews.ts`의 `fetchAndGenerateNews()`가 시장/RSS 데이터를 수집
  2. 같은 파일의 `generateAiNews()`가 Gemini **배치 1회 호출**로 제목/요약을 재작성
  3. `app/api/generate-news/route.ts`는 `generateAiNews()` 결과만 반환

즉, 뉴스 AI 생성 로직은 `lib/generateNews.ts` 한 경로로 통일됩니다.

### 4) 일일 시장 리포트 생성 구조

일일 리포트는 `lib/contentGenerator.ts`의 `generateDailyReport(date)`가 중심입니다.

1. 데이터 수집 (병렬)
   - `fetchCoinMarket()`
   - `fetchMarketGlobal()`
   - `fetchFearGreed()`
   - `fetchLatestNews(8)`
2. 파생 데이터 계산
   - BTC/ETH 스냅샷
   - 상승/하락 Top3
   - 시가총액/도미넌스/공포탐욕 지표
3. Gemini 생성 (병렬)
   - BTC 분석
   - ETH 분석
   - 시장 전망
   - 핵심 이슈 5개
   - 3문장 요약
4. 정규화/후처리
   - 핵심 이슈 번호 파싱
   - SEO 키워드 생성
5. API 캐싱/저장
   - `/api/daily-report`에서 `public/content/daily-reports/{date}.json` 파일 캐시 사용
   - 캐시 없으면 생성 후 파일 저장

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
