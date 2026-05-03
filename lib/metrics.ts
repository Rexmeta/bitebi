// Central metric registry used by the dynamic /money-tracker/[metric] page,
// the embed page, the comparison chart, and the CSV/JSON export endpoint.

export type MetricCategory =
  | 'macro'
  | 'stablecoin'
  | 'derivatives'
  | 'etf'
  | 'onchain'
  | 'korea'
  | 'defi'

export interface MetricDefinition {
  id: string
  title: string
  shortTitle: string
  category: MetricCategory
  unit: string
  description: string
  formula: string
  source: string
  // True when value is a derived proxy/approximation, not a direct first-party
  // measurement. Surfaced as a "근사" badge on KPI cards and detail pages.
  isProxy?: boolean
  apiPath: string             // /api/...
  selector: string            // dot-path inside response.data
  historySelector?: string    // dot-path to history array (objects with {date|timestamp, value|...})
  historyValueKey?: string    // key inside each history entry
  historyDateKey?: string     // key inside each history entry
  positiveDirection?: 'up' | 'down'
  relatedMetrics?: string[]
}

export const METRICS: Record<string, MetricDefinition> = {
  'global-liquidity': {
    id: 'global-liquidity',
    title: '글로벌 유동성 (Global M2)',
    shortTitle: '글로벌 M2',
    category: 'macro',
    unit: 'USD',
    description: '미국·유로존·일본·영국 등 주요 4개 경제권의 광의통화(M2/M3)를 미국 달러로 환산해 합산한 글로벌 유동성 지표입니다. 위험자산 상승 사이클의 가장 본질적인 거시 동력으로 평가됩니다.',
    formula: 'Σ M2_country × FX_to_USD',
    source: 'FRED + World Bank + Yahoo Finance',
    apiPath: '/api/monetary',
    selector: 'globalM2',
    historySelector: 'globalM2History',
    historyValueKey: 'value',
    historyDateKey: 'date',
    positiveDirection: 'up',
    relatedMetrics: ['stablecoin-supply', 'etf-flows'],
  },
  'stablecoin-supply': {
    id: 'stablecoin-supply',
    title: '스테이블코인 총 공급량',
    shortTitle: '스테이블 공급',
    category: 'stablecoin',
    unit: 'USD',
    description: 'USDT/USDC 등 USD 페그 스테이블코인의 온체인 유통량 총합. 신규 발행량은 시장으로 유입되는 잠재 매수 화력의 척도로 자주 활용됩니다.',
    formula: 'Σ circulating(stablecoin_i) [pegType=USD]',
    source: 'DefiLlama Stablecoins',
    apiPath: '/api/stablecoins',
    selector: 'totalSupply',
    historySelector: 'totalSupplyHistory',
    historyValueKey: 'value',
    historyDateKey: 'date',
    positiveDirection: 'up',
    relatedMetrics: ['exchange-netflow', 'etf-flows'],
  },
  'exchange-netflow': {
    id: 'exchange-netflow',
    title: '거래소 Netflow (BTC/ETH/Stable)',
    shortTitle: '거래소 Netflow',
    category: 'onchain',
    unit: 'USD',
    description: '거래소 라벨이 붙은 주요 지갑들의 7일 잔고 변화로 추정한 순유입/순유출. 양(+)이면 매도 압력, 음(-)이면 매수 보관 신호로 해석됩니다.',
    formula: 'balance(t) − balance(t-7d) [labelled exchange wallets]',
    source: 'DefiLlama (stable) + Alchemy 라벨 지갑 (ETH) + blockstream esplora (BTC)',
    apiPath: '/api/exchange-flows',
    selector: 'total.netflow7d',
    historySelector: 'total.history',
    historyValueKey: 'netflow',
    historyDateKey: 'date',
    positiveDirection: 'down',
    relatedMetrics: ['stablecoin-supply', 'derivatives'],
  },
  'derivatives': {
    id: 'derivatives',
    title: '파생상품 (OI · 펀딩 · 청산)',
    shortTitle: '파생',
    category: 'derivatives',
    unit: 'USD',
    description: 'BTC/ETH 무기한 선물의 합산 오픈 인터레스트, 평균 펀딩비, 24시간 청산 추정치. 시장 레버리지의 과열/이완 정도를 보여줍니다.',
    formula: 'Σ openInterest(usd) on Binance/Bybit/OKX perpetuals',
    source: 'Binance Futures public API + Coinglass public widget',
    isProxy: true,
    apiPath: '/api/derivatives',
    selector: 'totalOpenInterest',
    historySelector: 'history',
    historyValueKey: 'oi',
    historyDateKey: 'date',
    positiveDirection: 'up',
    relatedMetrics: ['exchange-netflow', 'onchain-cohorts'],
  },
  'etf-flows': {
    id: 'etf-flows',
    title: '현물 ETF 순유입',
    shortTitle: 'ETF 순유입',
    category: 'etf',
    unit: 'USD',
    description: '미국 BTC/ETH 현물 ETF의 일별 순유입(net inflow). 기관 자금 흐름의 가장 직접적인 척도이며, 누적값은 ETF 시장의 누적 순매수에 해당합니다.',
    formula: 'Σ daily netInflow(USD) across spot ETFs',
    source: 'SoSoValue (fallback: Farside Investors)',
    apiPath: '/api/etf-flows',
    selector: 'btc.cumulative',
    historySelector: 'btc.history',
    historyValueKey: 'netInflow',
    historyDateKey: 'date',
    positiveDirection: 'up',
    relatedMetrics: ['global-liquidity', 'stablecoin-supply'],
  },
  'onchain-cohorts': {
    id: 'onchain-cohorts',
    title: '온체인 코호트 (MVRV · LTH 공급)',
    shortTitle: '온체인 코호트',
    category: 'onchain',
    unit: 'ratio',
    description: 'MVRV는 시가총액 대비 실현가치 비율로 시장의 평균 매수가 대비 현재가를 나타냅니다. 1 미만이면 평균 손실, 2.4 초과면 역사적 과열 구간으로 평가됩니다.',
    formula: 'MarketCap / RealizedCap (proxy)',
    source: 'CoinGecko 가격 기반 파생 (Glassnode 무료 차트 미러)',
    isProxy: true,
    apiPath: '/api/onchain-cohorts',
    selector: 'mvrv.current',
    historySelector: 'mvrv.history',
    historyValueKey: 'value',
    historyDateKey: 'date',
    positiveDirection: 'up',
    relatedMetrics: ['exchange-netflow', 'etf-flows'],
  },
  'kimchi-premium': {
    id: 'kimchi-premium',
    title: '김치프리미엄',
    shortTitle: '김치프리미엄',
    category: 'korea',
    unit: '%',
    description: '한국 거래소(업비트)의 BTC-KRW 가격이 글로벌 시세(코인베이스 BTC-USD × USD/KRW 환율) 대비 얼마나 비싼지를 나타냅니다. 한국 수급 과열의 대표적인 지표입니다.',
    formula: '(UpbitKRW − CoinbaseUSD × USDKRW) / (CoinbaseUSD × USDKRW) × 100',
    source: 'Upbit + Coinbase + exchangerate.host',
    apiPath: '/api/korea',
    selector: 'kimchiPremium.value',
    positiveDirection: 'up',
    relatedMetrics: ['stablecoin-supply'],
  },
  'fear-greed': {
    id: 'fear-greed',
    title: '공포·탐욕 지수',
    shortTitle: '공포/탐욕',
    category: 'onchain',
    unit: 'index',
    description: 'Alternative.me 공포·탐욕 지수 (0=극도 공포 / 100=극도 탐욕). 변동성·거래량·소셜·도미넌스 등 6개 요소로 산출됩니다.',
    formula: 'Alternative.me 공식 가중합산',
    source: 'Alternative.me',
    apiPath: '/api/fear-greed',
    selector: '[0].value',
    historySelector: '',
    historyValueKey: 'value',
    historyDateKey: 'timestamp',
    relatedMetrics: ['onchain-cohorts'],
  },
}

export function getMetric(id: string): MetricDefinition | null {
  return METRICS[id] || null
}

export function listMetrics(): MetricDefinition[] {
  return Object.values(METRICS)
}

// Resolve "a.b.c" / "[0].value" against an arbitrary object.
export function resolvePath(obj: any, path: string): any {
  if (!path) return obj
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}
