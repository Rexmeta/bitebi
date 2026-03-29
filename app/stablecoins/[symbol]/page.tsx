'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdBanner from '../../components/AdBanner'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import type { StablecoinStats, StablecoinData, Article } from '../../types'

const COLORS: Record<string, string> = {
  USDT: '#26A17B', USDC: '#2775CA', DAI: '#F5AC37', BUSD: '#F0B90B',
  TUSD: '#2B2F7E', USDP: '#0052FF', GUSD: '#00DCFA', FRAX: '#000000', PYUSD: '#0033A0',
}

const COIN_INFO: Record<string, { description: string; type: string; issuer: string; launched: string; backing: string; audit: string }> = {
  USDT: {
    description: '테더(Tether, USDT)는 세계 최대 스테이블코인으로, 미국 달러에 1:1 페깅되어 있습니다. 비트파이넥스(Bitfinex)의 모회사 iFinex Inc.가 운영하는 Tether Limited에서 발행하며, 암호화폐 시장에서 가장 높은 거래량을 기록하고 있습니다. USDT는 다양한 블록체인 네트워크에서 운용되며, 특히 이더리움과 트론 네트워크에서의 활용도가 높습니다.',
    type: '법정화폐 담보형',
    issuer: 'Tether Limited (iFinex Inc.)',
    launched: '2014년',
    backing: '미국 국채, 현금 및 현금 등가물',
    audit: 'BDO Italia (분기별)',
  },
  USDC: {
    description: 'USD Coin(USDC)은 Circle Internet Financial에서 발행하는 완전 준비금 기반 스테이블코인입니다. Circle과 Coinbase가 공동 설립한 Centre 컨소시엄에서 시작되었으며, 미국 달러와 1:1로 교환됩니다. 규제 준수와 투명성을 강조하며, 매월 준비금 증명을 공개합니다.',
    type: '법정화폐 담보형',
    issuer: 'Circle Internet Financial',
    launched: '2018년',
    backing: '미국 국채, 현금',
    audit: 'Deloitte (월별 증명)',
  },
  DAI: {
    description: 'DAI는 MakerDAO 프로토콜을 통해 발행되는 탈중앙화 스테이블코인입니다. ETH, WBTC 등 암호화폐를 담보로 스마트 컨트랙트를 통해 자동으로 발행됩니다. 중앙 발행자 없이 운영되는 대표적인 DeFi 스테이블코인입니다.',
    type: '암호화폐 담보형 (탈중앙화)',
    issuer: 'MakerDAO (거버넌스)',
    launched: '2017년',
    backing: 'ETH, WBTC 등 암호자산 초과담보',
    audit: '온체인 검증 가능',
  },
  BUSD: {
    description: '바이낸스 USD(BUSD)는 바이낸스와 Paxos Trust Company가 공동 발행한 규제 준수 스테이블코인입니다. NYDFS의 승인을 받았으나, 2023년 이후 신규 발행이 중단되었습니다.',
    type: '법정화폐 담보형',
    issuer: 'Paxos Trust Company',
    launched: '2019년',
    backing: '미국 국채, 현금',
    audit: 'Withum (월별)',
  },
  TUSD: {
    description: 'TrueUSD(TUSD)는 독립적인 실시간 증명을 제공하는 스테이블코인으로, Chainlink Proof of Reserve를 통해 준비금을 검증합니다.',
    type: '법정화폐 담보형',
    issuer: 'Techteryx Ltd',
    launched: '2018년',
    backing: '미국 달러 예치금',
    audit: 'The Network Firm (실시간)',
  },
  USDP: {
    description: 'Pax Dollar(USDP)는 Paxos Trust Company가 발행하며, 뉴욕 금융서비스국(NYDFS)의 직접 규제를 받는 스테이블코인입니다.',
    type: '법정화폐 담보형',
    issuer: 'Paxos Trust Company',
    launched: '2018년',
    backing: '미국 국채, 현금 예치금',
    audit: 'Withum (월별)',
  },
  GUSD: {
    description: 'Gemini Dollar(GUSD)는 윙클보스 형제가 설립한 제미니 거래소에서 발행하며, NYDFS 규제 하에 운영되는 스테이블코인입니다.',
    type: '법정화폐 담보형',
    issuer: 'Gemini Trust Company',
    launched: '2018년',
    backing: '미국 달러 은행 예치금',
    audit: 'BPM LLP (월별)',
  },
}

const COIN_CHAINS: Record<string, string[]> = {
  USDT: ['이더리움', '트론', 'BSC', '솔라나', '아발란체', '폴리곤', '아비트럼', '옵티미즘'],
  USDC: ['이더리움', '솔라나', '아발란체', '폴리곤', 'Base', '아비트럼', '옵티미즘', '스텔라'],
  DAI: ['이더리움', '폴리곤', '옵티미즘', '아비트럼', 'Base'],
  BUSD: ['이더리움', 'BSC'],
  TUSD: ['이더리움', '트론', 'BSC', '아발란체'],
  USDP: ['이더리움'],
  GUSD: ['이더리움'],
}

const RISK_ANALYSIS: Record<string, { level: string; factors: string[] }> = {
  USDT: { level: '중간', factors: ['준비금 구성 투명성 논란', '역대 규제 이슈', '높은 시장 의존도'] },
  USDC: { level: '낮음', factors: ['정기 감사', 'NYDFS 규제', 'SVB 사태 시 단기 디페깅 경험'] },
  DAI: { level: '중간', factors: ['담보 자산 변동성', '스마트 컨트랙트 리스크', '거버넌스 공격 가능성'] },
  BUSD: { level: '높음', factors: ['신규 발행 중단', '바이낸스 규제 리스크', '유통량 지속 감소'] },
  TUSD: { level: '중간-높음', factors: ['발행사 변경 이력', '준비금 투명성 이슈', '디페깅 이력'] },
  USDP: { level: '낮음', factors: ['NYDFS 직접 규제', '보수적 준비금 운용'] },
  GUSD: { level: '낮음', factors: ['NYDFS 직접 규제', '낮은 유통량'] },
}

export default function StablecoinDetailPage() {
  const params = useParams()
  const symbol = (params.symbol as string).toUpperCase()
  const [coin, setCoin] = useState<StablecoinStats | null>(null)
  const [allCoins, setAllCoins] = useState<StablecoinStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [relatedNews, setRelatedNews] = useState<Article[]>([])

  useEffect(() => {
    fetch('/api/stablecoin')
      .then(r => r.json())
      .then((data: StablecoinData) => {
        const all = Object.values(data)
        setAllCoins(all)
        const found = all.find(c => c.symbol.toUpperCase() === symbol)
        if (found) setCoin(found)
        else setError(`${symbol} 데이터를 찾을 수 없습니다.`)
      })
      .catch(() => setError('데이터를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [symbol])

  useEffect(() => {
    fetch('/api/aggregate-news')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.articles) {
          const keyword = symbol === 'USDT' ? 'tether|usdt' : symbol === 'USDC' ? 'usdc|circle' : symbol === 'DAI' ? 'dai|maker' : symbol.toLowerCase()
          const re = new RegExp(keyword + '|stablecoin|스테이블', 'i')
          const filtered = data.articles.filter((a: Article) => re.test(a.title + (a.contentSnippet || ''))).slice(0, 6)
          setRelatedNews(filtered.length > 0 ? filtered : data.articles.slice(0, 4))
        }
      })
      .catch(() => {})
  }, [symbol])

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}시간 전`
    return `${Math.floor(hrs / 24)}일 전`
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" message="데이터를 불러오는 중..." /></div>
  if (error || !coin) return <div className="min-h-screen flex items-center justify-center"><ErrorMessage message={error || '데이터 없음'} /></div>

  const totalCirculation = allCoins.reduce((s, c) => s + c.circulation, 0)
  const marketShare = totalCirculation > 0 ? (coin.circulation / totalCirculation * 100) : 0
  const info = COIN_INFO[symbol]
  const risk = RISK_ANALYSIS[symbol]
  const chains = COIN_CHAINS[symbol] || ['이더리움']

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-white">홈</Link>
        <span>/</span>
        <Link href="/stablecoins" className="hover:text-white">스테이블코인</Link>
        <span>/</span>
        <span className="text-white">{symbol}</span>
      </nav>

      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: COLORS[symbol] || '#6b7280' }}>
            {symbol.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{coin.name} ({symbol})</h1>
            <p className="text-gray-400 text-sm">{info?.type || '법정화폐 담보형'} 스테이블코인</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">현재 가격</p>
            <p className="text-xl font-bold text-white">${coin.price.toFixed(4)}</p>
            <p className={`text-xs mt-1 ${coin.price_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {coin.price_percent_change_24h >= 0 ? '+' : ''}{coin.price_percent_change_24h.toFixed(4)}%
            </p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">유통량</p>
            <p className="text-xl font-bold text-white">{formatLargeNumber(coin.circulation)}</p>
            <p className={`text-xs mt-1 ${coin.circulation_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {coin.circulation_percent_change_24h >= 0 ? '+' : ''}{coin.circulation_percent_change_24h.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">24시간 거래량</p>
            <p className="text-xl font-bold text-white">{formatLargeNumber(coin.volume)}</p>
            <p className={`text-xs mt-1 ${coin.volume_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {coin.volume_percent_change_24h >= 0 ? '+' : ''}{coin.volume_percent_change_24h.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">시장 점유율</p>
            <p className="text-xl font-bold text-yellow-400">{marketShare.toFixed(1)}%</p>
            <p className="text-xs mt-1 text-gray-500">전체 스테이블코인 대비</p>
          </div>
        </div>
      </div>

      <AdBanner slot="3574861290" format="auto" style={{ minHeight: '100px' }} />

      {info && (
        <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
          <h2 className="text-lg font-bold text-yellow-400 mb-3">{coin.name} 소개</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{info.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between border-b border-[#21262d] pb-2">
                <span className="text-gray-500 text-sm">유형</span>
                <span className="text-white text-sm">{info.type}</span>
              </div>
              <div className="flex justify-between border-b border-[#21262d] pb-2">
                <span className="text-gray-500 text-sm">발행사</span>
                <span className="text-white text-sm">{info.issuer}</span>
              </div>
              <div className="flex justify-between border-b border-[#21262d] pb-2">
                <span className="text-gray-500 text-sm">출시</span>
                <span className="text-white text-sm">{info.launched}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-[#21262d] pb-2">
                <span className="text-gray-500 text-sm">준비금</span>
                <span className="text-white text-sm">{info.backing}</span>
              </div>
              <div className="flex justify-between border-b border-[#21262d] pb-2">
                <span className="text-gray-500 text-sm">감사</span>
                <span className="text-white text-sm">{info.audit}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500 text-sm">거래량/유통량</span>
                <span className="text-white text-sm">{coin.circulation > 0 ? (coin.volume / coin.circulation * 100).toFixed(2) : '-'}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
          <h2 className="text-lg font-bold text-white mb-3">지원 블록체인</h2>
          <div className="flex flex-wrap gap-2">
            {chains.map(chain => (
              <span key={chain} className="px-3 py-1.5 bg-[#21262d] text-gray-300 rounded-lg text-sm border border-[#30363d]">{chain}</span>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3">{symbol}은 {chains.length}개 블록체인 네트워크에서 사용할 수 있습니다.</p>
        </div>

        {risk && (
          <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
            <h2 className="text-lg font-bold text-white mb-3">리스크 분석</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-sm">위험 수준:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                risk.level === '낮음' ? 'bg-green-400/20 text-green-400' :
                risk.level === '높음' ? 'bg-red-400/20 text-red-400' :
                'bg-yellow-400/20 text-yellow-400'
              }`}>{risk.level}</span>
            </div>
            <ul className="space-y-2">
              {risk.factors.map((f, i) => (
                <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span> {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AdBanner slot="5844761427" format="auto" style={{ minHeight: '100px' }} />

      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <h2 className="text-lg font-bold text-white mb-3">24시간 변동 상세</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">유통량 변화</p>
            <p className={`text-lg font-bold ${coin.circulation_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {coin.circulation_change_24h >= 0 ? '+' : ''}{formatLargeNumber(Math.abs(coin.circulation_change_24h))}
            </p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">거래량 변화</p>
            <p className={`text-lg font-bold ${coin.volume_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {coin.volume_change_24h >= 0 ? '+' : ''}{formatLargeNumber(Math.abs(coin.volume_change_24h))}
            </p>
          </div>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <p className="text-gray-500 text-xs">가격 변동폭</p>
            <p className={`text-lg font-bold ${coin.price_percent_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {coin.price_percent_change_24h >= 0 ? '+' : ''}{coin.price_percent_change_24h.toFixed(4)}%
            </p>
          </div>
        </div>
      </div>

      {relatedNews.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-yellow-400 mb-4">{coin.name} 관련 뉴스</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedNews.map((article, i) => (
              <a key={i} href={article.link} target="_blank" rel="noopener noreferrer" className="bg-[#161b22] rounded-xl p-4 border border-[#30363d] hover:border-yellow-400/30 transition-colors block">
                <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">{article.title}</h3>
                {article.contentSnippet && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{article.contentSnippet}</p>}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-[#21262d] rounded">{article.source}</span>
                  <span>{timeAgo(article.pubDate)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <AdBanner slot="3574861290" format="auto" style={{ minHeight: '100px' }} />

      <div className="flex flex-wrap gap-3">
        <Link href="/stablecoins" className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-lg text-sm hover:bg-[#30363d] transition-colors">
          ← 스테이블코인 목록
        </Link>
        {allCoins.filter(c => c.symbol !== symbol).slice(0, 4).map(c => (
          <Link key={c.symbol} href={`/stablecoins/${c.symbol.toLowerCase()}`} className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-lg text-sm hover:bg-[#30363d] transition-colors">
            {c.symbol}
          </Link>
        ))}
      </div>
    </div>
  )
}
