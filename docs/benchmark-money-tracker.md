# 머니트래커 경쟁 벤치마크 매핑 (task #13)

본 문서는 머니트래커가 글로벌 동종 서비스와 비교했을 때의 격차를 매핑하고,
"채택 / 변형 / 제외"를 결정한 결과를 정리한다. 이후 단계는 이 표를 근거로 진행된다.

머니트래커의 포지션은 **"돈의 흐름을 가장 잘 보여주는 한국어 대시보드"** 이다.
트레이딩 도구(주문/포지션)는 의도적으로 제외하고, 매크로·온체인·ETF·파생/지역 흐름을 일관된 톤으로 묶는다.

## 0. 한 줄 정의
- CoinGlass = 파생/청산/ETF 데이터 허브
- CryptoQuant = 거래소 흐름·온체인 메트릭 (유료)
- Glassnode / Checkonchain = 온체인 코호트 (LTH/STH, MVRV, SOPR…)
- DefiLlama = 스테이블·TVL 표준 (이미 사용)
- The Block / Velo = 데이터 + 에디토리얼 UX
- Santiment = 소셜 + 온체인 시그널
- Nansen / Arkham = 라벨링 지갑 트래커
- TradingView = 알림·공유·임베드 표준

## 1. 데이터 폭 매핑

| 카테고리 | 핵심 지표 | 대표 서비스 | 머니트래커 결정 | 데이터 소스(무료 우선) |
|---|---|---|---|---|
| 파생상품 | BTC/ETH 합산 OI · 펀딩비 · 24h 청산 | CoinGlass | **채택** (1~5분 캐시) | Binance/Bybit/OKX 공개 API + Coinglass 공개 위젯 |
| 거래소 흐름 | BTC/ETH/스테이블 7d Netflow | CryptoQuant | **변형 채택** — 거래소 라벨 지갑 잔액 변화로 근사 | Etherscan/Blockchair 공개 잔액 + 자체 라벨 |
| 현물 ETF | BTC/ETH spot ETF 일별 순유입 | Farside / SoSoValue | **채택** | Farside Investors 공개 데이터 |
| 온체인 코호트 | MVRV, SOPR, LTH/STH 공급 | Glassnode/Checkonchain | **채택** (월 단위, 무료 범위) | Glassnode Free / mempool.space 공개 차트 미러 |
| 김치프리미엄 | 업비트 KRW vs Coinbase USD × USD-KRW | (한국 특화) | **채택** | Upbit + Coinbase + exchangerate.host |
| KRW 거래소 거래대금 | Upbit/Bithumb 24h vol & share | (한국 특화) | **채택** | Upbit/Bithumb 공식 공개 API |
| 매크로/금리 | M2/Fed/DXY/금/Nasdaq | TradingView/FRED | **유지** (이미 사용) | FRED + WorldBank + Yahoo |
| 소셜 시그널 | 멘션/감성 | Santiment | **제외 (이번 task)** | — |
| 지갑 라벨 트래커 | 큰손 이동 | Nansen/Arkham | **제외 (별도 whale-tracker가 담당)** | — |
| 청산 맵 | 가격대별 OI 분포 | CoinGlass | **이번엔 제외(저지연 부담)** | — |

## 2. 체류·개인화 매핑

| 기능 | 대표 서비스 | 결정 | 구현 방식 |
|---|---|---|---|
| 워치리스트 | TradingView | **채택 (경량)** | 브라우저 localStorage 기반 워치리스트 |
| 알림 (이메일/텔레그램/웹푸시) | TradingView/CoinGlass | **부분 채택** | 1차: 브라우저 Notification API + 로컬 임계값. 이메일/텔레그램은 후속 task로 분리 |
| 사용자 비교 차트 | TradingView/Velo | **채택** | `/money-tracker/compare` (지표 2개 오버레이 + 피어슨 + 리드-래그 + 공유 URL) |
| 임베드 위젯 | TradingView | **채택** | `/embed/[metric]` 경량 페이지(폭 자동) |
| CSV/JSON 내보내기 | DefiLlama | **채택** | `/api/metric/[id]?format=csv|json` |
| OG 이미지 | The Block | **채택** | 지표 단독 페이지 OG 자동 생성 |

## 3. 시그널 신뢰도 매핑

| 항목 | 대표 서비스 | 결정 | 구현 |
|---|---|---|---|
| 룰 기반 신호 | (자체) | **유지** | `useMoneyTrackerData.generateSignals` |
| 신호 발동 히스토리 | CryptoQuant Quicktake | **채택 (경량)** | 파일 기반 시그널 로그(`data/signal-history.json`) — 대시보드 호출 시 incremental append |
| 간이 백테스트(N일 후 BTC 수익률) | (없음) | **채택** | 신호 발동일 + N일 BTC 종가 차이 평균/중앙값 |
| 룰별 근거 데이터 | (없음) | **채택** | 시그널 객체에 `evidence` 필드 추가 |

## 4. SEO/바이럴 매핑

| 자산 | 대표 서비스 | 결정 |
|---|---|---|
| 지표 단독 랜딩(`/metric/{id}`) | DefiLlama, CoinGlass | **채택** (`/money-tracker/[metric]`) |
| 임베드 위젯(`/embed/{id}`) | TradingView | **채택** |
| OG 이미지 자동 생성 | The Block | **채택** |
| 정의/계산식/소스 표기 | Glassnode Studio | **채택** (메트릭 메타에 포함) |
| 지표별 SSR 메타 | DefiLlama | **채택** |

## 5. 핵심 6블록 (Overview 재구성)

데스크톱 3×2, 모바일 가로 스와이프. 각 카드는
`현재값 + 1D / 7D / 30D / YTD 변화 + 스파크라인 + "자세히" 링크` 를 갖는다.

1. **글로벌 유동성** — Global M2 / Fed Funds / DXY (`/money-tracker/global-liquidity`)
2. **스테이블코인 순발행** — Total stablecoin supply, 7d Net issuance (`/money-tracker/stablecoin-supply`)
3. **거래소 Netflow** — BTC/ETH/Stable 7d 거래소 잔고 변화 (`/money-tracker/exchange-netflow`)
4. **파생상품** — Aggregated OI, Funding Rate, 24h Liquidations (`/money-tracker/derivatives`)
5. **현물 ETF 순유입** — BTC/ETH spot ETF 일별 net inflow (`/money-tracker/etf-flows`)
6. **온체인 코호트** — MVRV / LTH 공급 비중 / Realized Price (`/money-tracker/onchain-cohorts`)

부가:
- **Korea Pulse** — 김치프리미엄, Upbit/Bithumb 거래대금, KRW 마켓 상승률 상위 (`/money-tracker/korea`)
- **Compare** — 사용자 정의 비교 차트 (`/money-tracker/compare`)

## 6. Out of scope (재확인)
- 실거래/주문, PnL 추적
- 유료 API 상품화/결제 시스템
- 청산 맵 등 "초저지연" 시각화
- 인증 시스템 전면 재설계 (이메일/텔레그램 알림은 후속 task로 분리)
- AI 글 자동 생성 파이프라인 자체의 재설계
