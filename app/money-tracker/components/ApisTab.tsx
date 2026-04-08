'use client'
import React from 'react'

interface ApisTabProps {
  hasFredKey: boolean
}

export default function ApisTab({ hasFredKey }: ApisTabProps) {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8 mb-8">
      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur col-span-1 md:col-span-2 xl:col-span-3 text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">🔗</span>
          활성 데이터 소스
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-600 font-bold mb-1">✅ DefiLlama</div>
            <p className="text-xs text-gray-600">스테이블코인, TVL, 체인별 분포</p>
            <p className="text-xs text-green-500 mt-1">실시간 연동</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-600 font-bold mb-1">✅ CoinGecko</div>
            <p className="text-xs text-gray-600">BTC 가격, 시장 데이터</p>
            <p className="text-xs text-green-500 mt-1">실시간 연동</p>
          </div>
          <div className={`${hasFredKey ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 text-center transition-all`}>
            <div className={`${hasFredKey ? 'text-green-600' : 'text-blue-600'} font-bold mb-1`}>
              {hasFredKey ? '✅ FRED API 연동됨' : '🔑 FRED API'}
            </div>
            <p className="text-xs text-gray-600">미국 M2 통화량, 금리 등</p>
            <p className={`${hasFredKey ? 'text-green-500' : 'text-blue-500'} text-xs mt-1 font-semibold`}>
              {hasFredKey ? '데이터 수신 중' : 'API 키 필요 (무료)'}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-600 font-bold mb-1">✅ Alternative.me</div>
            <p className="text-xs text-gray-600">공포·탐욕 지수</p>
            <p className="text-xs text-green-500 mt-1">실시간 연동</p>
          </div>
        </div>
      </div>
      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">💻</span>
          API 활용 예시
        </h2>
        <h3 className="font-bold mb-2">DefiLlama - 스테이블코인</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 스테이블코인 데이터\ncurl https://stablecoins.llama.fi/stablecoins\n\n# 체인별 분포\ncurl https://stablecoins.llama.fi/stablecoinchains\n\n# DeFi TVL 히스토리\ncurl https://api.llama.fi/v2/historicalChainTvl'}
        </div>
        <h3 className="font-bold mb-2">FRED API - M2 통화량</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 미국 M2 통화량 (무료 API 키 필요)\ncurl "https://api.stlouisfed.org/fred/series/\n  observations?series_id=M2SL&api_key=YOUR_KEY\n  &file_type=json&sort_order=desc&limit=12"\n\n# 연방기금금리\ncurl "https://api.stlouisfed.org/fred/series/\n  observations?series_id=FEDFUNDS&api_key=YOUR_KEY\n  &file_type=json&sort_order=desc&limit=12"'}
        </div>
      </div>
      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">⚙️</span>
          데이터 갱신 정책
        </h2>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-bold text-sm">캐싱 정책</h3>
            <p className="text-xs text-gray-600">모든 API 응답은 서버에서 5분간 캐시됩니다</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-bold text-sm">자동 새로고침</h3>
            <p className="text-xs text-gray-600">대시보드 데이터는 5분마다 자동으로 갱신됩니다</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-bold text-sm">폴백 처리</h3>
            <p className="text-xs text-gray-600">API 오류 시 마지막 성공 데이터를 표시하고 재시도 버튼을 제공합니다</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-bold text-sm">데이터 소스 우선순위</h3>
            <p className="text-xs text-gray-600">DefiLlama → CoinGecko → 캐시 데이터 순서로 폴백합니다</p>
          </div>
        </div>
      </div>
      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">📡</span>
          추가 데이터 소스 (참고)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-100 rounded-lg p-3 text-center hover:bg-gray-200 transition"><h3 className="text-sm font-bold">ECB Data Portal</h3><p className="text-xs">유로존 통화 통계</p></div>
          <div className="bg-gray-100 rounded-lg p-3 text-center hover:bg-gray-200 transition"><h3 className="text-sm font-bold">PBOC Statistics</h3><p className="text-xs">중국 M2 통화량</p></div>
          <div className="bg-gray-100 rounded-lg p-3 text-center hover:bg-gray-200 transition"><h3 className="text-sm font-bold">BIS SDMX</h3><p className="text-xs">국제결제 통계</p></div>
          <div className="bg-gray-100 rounded-lg p-3 text-center hover:bg-gray-200 transition"><h3 className="text-sm font-bold">IMF Data</h3><p className="text-xs">글로벌 금융 지표</p></div>
        </div>
      </div>
    </div>
  )
}
