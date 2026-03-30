'use client'
import React from 'react'

export default function AnalysisTab() {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🔬</span>
          분석 방법론
        </h2>
        <h3 className="font-bold mb-2">1. 양적 분석</h3>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 시계열 분석 예시\nimport requests\nimport pandas as pd\n\n# 스테이블코인 데이터 수집\ndef get_stablecoin_metrics():\n    url = "https://api.llama.fi/stablecoins"\n    response = requests.get(url)\n    return response.json()\n\n# 채택률 트렌드 분석\ndef analyze_adoption_trend(data):\n    df = pd.DataFrame(data)\n    trend = df[\'totalCirculating\'].pct_change()\n    return trend.rolling(30).mean()\n'}
        </div>
        <h3 className="font-bold mb-2">2. 질적 분석</h3>
        <p>• 정책 충격 분석 (Event Study)<br />• 네트워크 효과 분석 (Metcalfe's Law)<br />• 지정학적 리스크 평가</p>
      </div>
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📊</span>
          투자 신호 해석
        </h2>
        <div className="bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1">🟢 강세 신호</h3>
          <p>• 조정 전송량 $50B 돌파<br />• 수익률 제공 스테이블코인 성장<br />• 기업 직접 API 연동 증가</p>
        </div>
        <div className="bg-gradient-to-r from-red-100 to-red-200 border-l-4 border-red-400 p-4 rounded-lg">
          <h3 className="font-bold mb-1">🔴 약세 신호</h3>
          <p>• CBDC 강제 도입 압력<br />• 규제 리스크 증가<br />• 기술적 불안정성</p>
        </div>
      </div>
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">💼</span>
          포트폴리오 전략
        </h2>
        <h3 className="font-bold mb-2">단계별 익스포저</h3>
        <div className="mb-4">
          <div className="mb-3">
            <strong>1단계 (현재):</strong> 블록체인 인프라 5-10%
            <div className="bg-gray-200 h-5 rounded-lg overflow-hidden mb-1"><div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: '10%' }}></div></div>
          </div>
          <div className="mb-3">
            <strong>2단계 (임계점):</strong> 크립토 서비스 15-20%
            <div className="bg-gray-200 h-5 rounded-lg overflow-hidden mb-1"><div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-lg" style={{ width: '20%' }}></div></div>
          </div>
          <div className="mb-3">
            <strong>3단계 (주류채택):</strong> 새로운 배분 모델
            <div className="bg-gray-200 h-5 rounded-lg overflow-hidden"><div className="h-full bg-gradient-to-r from-green-400 to-green-200 rounded-lg" style={{ width: '35%' }}></div></div>
          </div>
        </div>
      </div>
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">⏰</span>
          모니터링 주기
        </h2>
        <h3 className="font-bold mb-2">일간 모니터링</h3>
        <p>• 거래량 및 발행량 추적<br />• 디페깅 사건 모니터링<br />• 규제 뉴스 수집</p>
        <h3 className="font-bold mb-2 mt-4">주간 분석</h3>
        <p>• 거래 패턴 변화 분석<br />• 지역별 채택률 추적<br />• 경쟁 CBDC 진행상황</p>
        <h3 className="font-bold mb-2 mt-4">월간 전략</h3>
        <p>• 장기 트렌드 예측<br />• 포트폴리오 리밸런싱<br />• 리스크 재평가</p>
      </div>
    </div>
  )
}
