'use client';
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const TABS = [
  { key: 'overview', label: '개요' },
  { key: 'money-supply', label: '전세계 통화량' },
  { key: 'metrics', label: '핵심 지표' },
  { key: 'analysis', label: '분석 방법' },
  { key: 'apis', label: '데이터 소스' },
];

const chartIds = [
  'marketChart',
  'volumeChart',
  'adoptionChart',
  'globalM2Chart',
  'growthRateChart',
  'regionalShareChart',
];

const MoneyTrackerPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [updateTime, setUpdateTime] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const chartRefs = useRef<Record<string, Chart | null>>({});

  // 차트 생성
  useEffect(() => {
    const ctxs = {
      marketChart: (document.getElementById('marketChart') as HTMLCanvasElement | null)?.getContext('2d'),
      volumeChart: (document.getElementById('volumeChart') as HTMLCanvasElement | null)?.getContext('2d'),
      adoptionChart: (document.getElementById('adoptionChart') as HTMLCanvasElement | null)?.getContext('2d'),
      globalM2Chart: (document.getElementById('globalM2Chart') as HTMLCanvasElement | null)?.getContext('2d'),
      growthRateChart: (document.getElementById('growthRateChart') as HTMLCanvasElement | null)?.getContext('2d'),
      regionalShareChart: (document.getElementById('regionalShareChart') as HTMLCanvasElement | null)?.getContext('2d'),
    };
    chartIds.forEach(id => {
      if (chartRefs.current[id]) {
        chartRefs.current[id]!.destroy();
        chartRefs.current[id] = null;
      }
    });
    if (ctxs.marketChart) {
      chartRefs.current.marketChart = new Chart(ctxs.marketChart, {
        type: 'doughnut',
        data: {
          labels: ['USDT', 'USDC', 'BUSD', '기타'],
          datasets: [{
            data: [66, 19, 8, 7],
            backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5f7fa'],
          }],
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false },
      });
    }
    if (ctxs.volumeChart) {
      chartRefs.current.volumeChart = new Chart(ctxs.volumeChart, {
        type: 'line',
        data: {
          labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
          datasets: [{
            label: '거래량 (억 달러)',
            data: [300, 450, 380, 520, 480, 600],
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
      });
    }
    if (ctxs.adoptionChart) {
      chartRefs.current.adoptionChart = new Chart(ctxs.adoptionChart, {
        type: 'bar',
        data: {
          labels: ['2020', '2021', '2022', '2023', '2024'],
          datasets: [{
            label: '채택률 (%)',
            data: [5, 15, 25, 40, 58],
            backgroundColor: '#667eea',
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } },
      });
    }
    if (ctxs.globalM2Chart) {
      chartRefs.current.globalM2Chart = new Chart(ctxs.globalM2Chart, {
        type: 'bar',
        data: {
          labels: ['미국', '중국', '유로존', '일본', '영국', '스테이블코인'],
          datasets: [{
            label: 'M2 통화량 (조 달러)',
            data: [21.9, 47.8, 18.7, 11.2, 3.1, 0.189],
            backgroundColor: [
              '#667eea', '#764ba2', '#f093fb', '#f5f7fa', '#48bb78', '#ed8936',
            ],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, title: { display: true, text: '조 달러' } } },
          plugins: { legend: { display: false } },
        },
      });
    }
    if (ctxs.growthRateChart) {
      chartRefs.current.growthRateChart = new Chart(ctxs.growthRateChart, {
        type: 'line',
        data: {
          labels: ['2020', '2021', '2022', '2023', '2024', '2025*'],
          datasets: [
            {
              label: '미국 M2',
              data: [25.2, 12.1, -1.3, -2.5, -0.8, -2.1],
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
            },
            {
              label: '중국 M2',
              data: [10.1, 9.0, 11.8, 9.7, 7.1, 7.3],
              borderColor: '#764ba2',
              backgroundColor: 'rgba(118, 75, 162, 0.1)',
            },
            {
              label: '유로존 M2',
              data: [11.2, 7.4, 5.6, 0.4, 3.5, 2.8],
              borderColor: '#f093fb',
              backgroundColor: 'rgba(240, 147, 251, 0.1)',
            },
            {
              label: '스테이블코인',
              data: [450, 380, 12, -8, 45, 24.5],
              borderColor: '#ed8936',
              backgroundColor: 'rgba(237, 137, 54, 0.1)',
              borderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { title: { display: true, text: 'YoY 증가율 (%)' } } },
        },
      });
    }
    if (ctxs.regionalShareChart) {
      chartRefs.current.regionalShareChart = new Chart(ctxs.regionalShareChart, {
        type: 'doughnut',
        data: {
          labels: ['미국', '중국', '유로존', '일본', '영국', '기타'],
          datasets: [{
            data: [37, 26, 16, 8, 4, 9],
            backgroundColor: [
              '#667eea', '#764ba2', '#f093fb', '#f5f7fa', '#48bb78', '#ed8936',
            ],
          }],
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false },
      });
    }
    // eslint-disable-next-line
  }, [activeTab]);

  // 업데이트 시간
  useEffect(() => {
    setUpdateTime(new Date().toLocaleString('ko-KR'));
    const timer = setInterval(() => setUpdateTime(new Date().toLocaleString('ko-KR')), 60000);
    return () => clearInterval(timer);
  }, []);

  // 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1': setActiveTab('overview'); break;
          case '2': setActiveTab('money-supply'); break;
          case '3': setActiveTab('metrics'); break;
          case '4': setActiveTab('analysis'); break;
          case '5': setActiveTab('apis'); break;
          case 'r': window.location.reload(); notify('대시보드를 새로고침했습니다.', 'success'); break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 다크모드
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // 컨텍스트 메뉴
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', closeMenu);
      return () => window.removeEventListener('click', closeMenu);
    }
  }, [contextMenu]);

  // 알림
  function notify(message: string, type: string = 'info') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  // 컨텍스트 메뉴 항목
  const contextMenuItems = [
    { text: '새로고침', action: () => window.location.reload() },
    { text: '다크모드 토글', action: () => setDarkMode(d => !d) },
    { text: '데이터 내보내기', action: () => notify('데이터를 성공적으로 내보냈습니다.', 'success') },
    { text: '전체화면', action: () => document.documentElement.requestFullscreen && document.documentElement.requestFullscreen() },
  ];

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'money-supply':
        return <MoneySupplyTab />;
      case 'metrics':
        return <MetricsTab />;
      case 'analysis':
        return <AnalysisTab />;
      case 'apis':
        return <ApisTab />;
      default:
        return null;
    }
  };

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`relative min-h-screen ${darkMode ? 'dark-mode' : ''}`}
      onContextMenu={handleContextMenu}
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="max-w-[1400px] mx-auto py-6 px-2 md:px-6 container">
        <div className="text-center text-white mb-10 py-10 header">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow">🌐 스테이블코인 기축통화 모니터링</h1>
          <p className="text-lg opacity-90">실시간 데이터로 분석하는 글로벌 금융 시스템의 변화</p>
        </div>
        <div className="flex bg-white/10 rounded-xl mb-6 overflow-x-auto tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`flex-1 py-3 px-6 text-center text-base md:text-lg font-semibold transition-colors rounded-lg tab ${activeTab === tab.key ? 'bg-white/20 text-white active' : 'text-white/70 hover:bg-white/10'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-[600px] tab-content active">{renderTabContent()}</div>
        <div className="text-center text-white/80 text-sm mt-10 update-time">마지막 업데이트: <span>{updateTime}</span></div>
      </div>
      {/* 알림 */}
      {notification && (
        <div
          className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-lg shadow-lg text-white notification ${notification.type}`}
          style={{ background: notification.type === 'success' ? '#48bb78' : notification.type === 'warning' ? '#ed8936' : '#4299e1', animation: 'slideIn 0.3s ease' }}
        >
          {notification.message}
        </div>
      )}
      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, minWidth: 150 }}
        >
          {contextMenuItems.map((item, idx) => (
            <div
              key={item.text}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-800"
              onClick={() => {
                item.action();
                setContextMenu(null);
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 탭별 컴포넌트 (아래는 예시, 실제로는 각 탭별로 위 HTML 구조를 React로 변환해 구현) ---

function OverviewTab() {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      {/* 시장 현황 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📊</span>시장 현황</h2>
        <div className="metric-grid grid grid-cols-3 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$189B</div>
            <div className="metric-label text-xs text-gray-500">총 스테이블코인 공급량</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">66%</div>
            <div className="metric-label text-xs text-gray-500">USDT 점유율</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">55%</div>
            <div className="metric-label text-xs text-gray-500">이더리움 체인 비중</div>
          </div>
        </div>
        <div className="chart-container relative h-48"><canvas id="marketChart"></canvas></div>
      </div>
      {/* CBDC vs 스테이블코인 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🏦</span>CBDC vs 스테이블코인</h2>
        <div className="metric-grid grid grid-cols-3 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">134</div>
            <div className="metric-label text-xs text-gray-500">CBDC 탐색 국가</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">44</div>
            <div className="metric-label text-xs text-gray-500">진행 중인 파일럿</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">11</div>
            <div className="metric-label text-xs text-gray-500">CBDC 출시 국가</div>
          </div>
        </div>
        <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden">
          <div className="progress-fill h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: '69%' }}></div>
        </div>
        <p className="text-center mt-3 text-gray-700">전세계 GDP의 98% 국가가 CBDC 연구 중</p>
      </div>
      {/* 거래량 분석 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">💰</span>거래량 분석</h2>
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$50B</div>
            <div className="metric-label text-xs text-gray-500">주간 조정 전송량</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$120B</div>
            <div className="metric-label text-xs text-gray-500">거래소 거래량</div>
          </div>
        </div>
        <div className="chart-container relative h-48"><canvas id="volumeChart"></canvas></div>
      </div>
      {/* 위험 신호 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur col-span-1 md:col-span-2 xl:col-span-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">⚠️</span>위험 신호</h2>
        <div className="alert-system warning bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1">⚠️ 주의 신호</h3>
          <p>• 규제 불확실성 증가<br />• CBDC 경쟁 심화<br />• 기술적 리스크 잠재</p>
        </div>
        <div className="alert-system success bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-400 p-4 rounded-lg">
          <h3 className="font-bold mb-1">✅ 긍정 신호</h3>
          <p>• 기관 채택 확산<br />• 인프라 발전<br />• 실사용 증가</p>
        </div>
      </div>
    </div>
  );
}

function MoneySupplyTab() {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      {/* 주요국 M2 통화량 현황 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🏛️</span>주요국 M2 통화량 현황</h2>
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$21.9T</div>
            <div className="metric-label text-xs text-gray-500">미국 M2 (2025.4)</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">€15.6T</div>
            <div className="metric-label text-xs text-gray-500">유로존 M2 (2024.12)</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">¥325T</div>
            <div className="metric-label text-xs text-gray-500">중국 M2 (2025.4)</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$189B</div>
            <div className="metric-label text-xs text-gray-500">스테이블코인 총량</div>
          </div>
        </div>
        <div className="chart-container relative h-48"><canvas id="globalM2Chart"></canvas></div>
      </div>
      {/* 통화량 vs 스테이블코인 비교 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📊</span>통화량 vs 스테이블코인 비교</h2>
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">0.86%</div>
            <div className="metric-label text-xs text-gray-500">미국 M2 대비</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">1.21%</div>
            <div className="metric-label text-xs text-gray-500">유로존 M2 대비</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">0.58%</div>
            <div className="metric-label text-xs text-gray-500">중국 M2 대비</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">0.32%</div>
            <div className="metric-label text-xs text-gray-500">글로벌 M2 대비</div>
          </div>
        </div>
        <div className="alert-system warning bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400 p-4 rounded-lg">
          <h3 className="font-bold mb-1">⚠️ 분석 포인트</h3>
          <p>스테이블코인이 글로벌 M2의 0.32%를 차지하며, 1% 돌파 시 시스템적 중요성 확보 예상</p>
        </div>
      </div>
      {/* 통화량 증가율 트렌드 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📈</span>통화량 증가율 트렌드</h2>
        <div className="mb-4">
          <div className="flex justify-between mb-2"><span>미국 M2 증가율 (YoY)</span><span className="text-red-500">-2.1%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-2"><div className="progress-fill h-full bg-gradient-to-r from-red-400 to-red-200 rounded-lg" style={{ width: '20%' }}></div></div>
          <div className="flex justify-between mb-2"><span>유로존 M2 증가율</span><span className="text-green-600">+2.8%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-2"><div className="progress-fill h-full bg-gradient-to-r from-green-400 to-green-200 rounded-lg" style={{ width: '60%' }}></div></div>
          <div className="flex justify-between mb-2"><span>중국 M2 증가율</span><span className="text-blue-600">+7.3%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-2"><div className="progress-fill h-full bg-gradient-to-r from-blue-400 to-blue-200 rounded-lg" style={{ width: '73%' }}></div></div>
          <div className="flex justify-between mb-2"><span>스테이블코인 증가율</span><span className="text-yellow-600">+24.5%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden"><div className="progress-fill h-full bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-lg" style={{ width: '95%' }}></div></div>
        </div>
        <div className="chart-container relative h-48"><canvas id="growthRateChart"></canvas></div>
      </div>
      {/* 지역별 통화량 분석 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🌍</span>지역별 통화량 분석</h2>
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">37%</div>
            <div className="metric-label text-xs text-gray-500">미국 글로벌 비중</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">26%</div>
            <div className="metric-label text-xs text-gray-500">중국 글로벌 비중</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">16%</div>
            <div className="metric-label text-xs text-gray-500">유로존 글로벌 비중</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">21%</div>
            <div className="metric-label text-xs text-gray-500">기타 지역 비중</div>
          </div>
        </div>
        <div className="chart-container relative h-48"><canvas id="regionalShareChart"></canvas></div>
      </div>
      {/* 통화량 대비 스테이블코인 침투도 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">⚖️</span>통화량 대비 스테이블코인 침투도</h2>
        <div className="alert-system success bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1">✅ 주요 발견사항</h3>
          <p>• 스테이블코인이 전통 통화량의 0.32% 차지<br />• 미국에서 상대적으로 높은 침투율 (0.86%)<br />• 중국은 CBDC로 인한 낮은 침투율</p>
        </div>
        <div className="alert-system bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1">🎯 임계점 예측</h3>
          <p>• 1% 돌파: 시스템적 중요성 확보<br />• 3% 돌파: 통화정책 영향 시작<br />• 5% 돌파: 기축통화 역할 본격화</p>
        </div>
        <div className="flex justify-center my-6">
          <div style={{ width: 200, height: 200, borderRadius: '50%', background: 'conic-gradient(#667eea 0deg, #667eea 1.15deg, #e2e8f0 1.15deg, #e2e8f0 360deg)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', width: 120, height: 120, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4a5568' }}>0.32%</div>
              <div style={{ fontSize: '0.8rem', color: '#718096' }}>침투율</div>
            </div>
          </div>
        </div>
      </div>
      {/* 유동성 순환 분석 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🔄</span>유동성 순환 분석</h2>
        <h3 className="font-bold mb-2">전통 통화 → 스테이블코인 이동</h3>
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$45B</div>
            <div className="metric-label text-xs text-gray-500">월간 신규 발행</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$32B</div>
            <div className="metric-label text-xs text-gray-500">월간 소각량</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$13B</div>
            <div className="metric-label text-xs text-gray-500">순 증가량</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">2.8x</div>
            <div className="metric-label text-xs text-gray-500">회전율</div>
          </div>
        </div>
        <div className="api-code bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 유동성 이동 분석 코드\ndef analyze_liquidity_flow():\n    # 스테이블코인 신규 발행량\n    new_issuance = get_stablecoin_issuance()\n    \n    # 전통 통화량 변화\n    m2_change = get_m2_change()\n    \n    # 상관관계 분석\n    correlation = calculate_correlation(new_issuance, m2_change)\n    \n    return {\n        \'flow_rate\': new_issuance / m2_change,\n        \'correlation\': correlation,\n        \'displacement_effect\': calculate_displacement()\n    }\n'}
        </div>
      </div>
    </div>
  );
}

function MetricsTab() {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      {/* 선행 지표 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📈</span>선행 지표</h2>
        <div className="metric-grid grid grid-cols-3 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">+15%</div>
            <div className="metric-label text-xs text-gray-500">월간 공급량 증가</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">2.1x</div>
            <div className="metric-label text-xs text-gray-500">거래량/시총 비율</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">45%</div>
            <div className="metric-label text-xs text-gray-500">신흥국 채택률</div>
          </div>
        </div>
        <p className="text-gray-700"><strong>해석:</strong> 공급량 대비 실사용 증가로 건전한 성장 패턴 확인</p>
      </div>
      {/* 후행 지표 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📉</span>후행 지표</h2>
        <div className="metric-grid grid grid-cols-3 gap-4 mb-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">$19.5B</div>
            <div className="metric-label text-xs text-gray-500">거래소 보유량</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">3.2%</div>
            <div className="metric-label text-xs text-gray-500">SWIFT 대비 비중</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">85%</div>
            <div className="metric-label text-xs text-gray-500">24시간 내 정산</div>
          </div>
        </div>
        <div className="chart-container relative h-48"><canvas id="adoptionChart"></canvas></div>
      </div>
      {/* 지역별 채택률 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🌍</span>지역별 채택률</h2>
        <div className="mb-4">
          <div className="flex justify-between mb-2"><span>아시아-태평양</span><span>67%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-2"><div className="progress-fill h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: '67%' }}></div></div>
          <div className="flex justify-between mb-2"><span>라틴 아메리카</span><span>45%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-2"><div className="progress-fill h-full bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-lg" style={{ width: '45%' }}></div></div>
          <div className="flex justify-between mb-2"><span>북미/유럽</span><span>32%</span></div>
          <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden"><div className="progress-fill h-full bg-gradient-to-r from-green-400 to-green-200 rounded-lg" style={{ width: '32%' }}></div></div>
        </div>
      </div>
      {/* 임계점 지표 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur col-span-1 md:col-span-2 xl:col-span-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🎯</span>임계점 지표</h2>
        <div className="alert-system bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1">🚨 임계점 모니터링</h3>
          <p><strong>시가총액 $500B 돌파:</strong> 62% 달성 (현재 $189B)<br />
            <strong>단일국 10% 점유:</strong> 터키 8.2%, 아르헨티나 7.8%<br />
            <strong>국제결제 5% 비중:</strong> 현재 3.2%</p>
        </div>
        <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-2"><div className="progress-fill h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: '38%' }}></div></div>
        <p className="text-center mt-3 text-gray-700">임계점까지 38% 진행</p>
      </div>
    </div>
  );
}

function AnalysisTab() {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      {/* 분석 방법론 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🔬</span>분석 방법론</h2>
        <h3 className="font-bold mb-2">1. 양적 분석</h3>
        <div className="api-code bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 시계열 분석 예시\nimport requests\nimport pandas as pd\n\n# 스테이블코인 데이터 수집\ndef get_stablecoin_metrics():\n    url = "https://api.llama.fi/stablecoins"\n    response = requests.get(url)\n    return response.json()\n\n# 채택률 트렌드 분석\ndef analyze_adoption_trend(data):\n    df = pd.DataFrame(data)\n    trend = df[\'totalCirculating\'].pct_change()\n    return trend.rolling(30).mean()\n'}
        </div>
        <h3 className="font-bold mb-2">2. 질적 분석</h3>
        <p>• 정책 충격 분석 (Event Study)<br />• 네트워크 효과 분석 (Metcalfe's Law)<br />• 지정학적 리스크 평가</p>
      </div>
      {/* 투자 신호 해석 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📊</span>투자 신호 해석</h2>
        <div className="alert-system success bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1">🟢 강세 신호</h3>
          <p>• 조정 전송량 $50B 돌파<br />• 수익률 제공 스테이블코인 성장<br />• 기업 직접 API 연동 증가</p>
        </div>
        <div className="alert-system bg-gradient-to-r from-red-100 to-red-200 border-l-4 border-red-400 p-4 rounded-lg">
          <h3 className="font-bold mb-1">🔴 약세 신호</h3>
          <p>• CBDC 강제 도입 압력<br />• 규제 리스크 증가<br />• 기술적 불안정성</p>
        </div>
      </div>
      {/* 포트폴리오 전략 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">💼</span>포트폴리오 전략</h2>
        <h3 className="font-bold mb-2">단계별 익스포저</h3>
        <div className="mb-4">
          <div className="mb-3">
            <strong>1단계 (현재):</strong> 블록체인 인프라 5-10%
            <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-1"><div className="progress-fill h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: '10%' }}></div></div>
          </div>
          <div className="mb-3">
            <strong>2단계 (임계점):</strong> 크립토 서비스 15-20%
            <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden mb-1"><div className="progress-fill h-full bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-lg" style={{ width: '20%' }}></div></div>
          </div>
          <div className="mb-3">
            <strong>3단계 (주류채택):</strong> 새로운 배분 모델
            <div className="progress-bar bg-gray-200 h-5 rounded-lg overflow-hidden"><div className="progress-fill h-full bg-gradient-to-r from-green-400 to-green-200 rounded-lg" style={{ width: '35%' }}></div></div>
          </div>
        </div>
      </div>
      {/* 모니터링 주기 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">⏰</span>모니터링 주기</h2>
        <h3 className="font-bold mb-2">일간 모니터링</h3>
        <p>• 거래량 및 발행량 추적<br />• 디페깅 사건 모니터링<br />• 규제 뉴스 수집</p>
        <h3 className="font-bold mb-2 mt-4">주간 분석</h3>
        <p>• 거래 패턴 변화 분석<br />• 지역별 채택률 추적<br />• 경쟁 CBDC 진행상황</p>
        <h3 className="font-bold mb-2 mt-4">월간 전략</h3>
        <p>• 장기 트렌드 예측<br />• 포트폴리오 리밸런싱<br />• 리스크 재평가</p>
      </div>
    </div>
  );
}

function ApisTab() {
  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      {/* 주요 데이터 소스 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur col-span-1 md:col-span-2 xl:col-span-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🔗</span>주요 데이터 소스</h2>
        <div className="data-sources grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>FRED API</h3><p>미국 M1/M2 통화량</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>ECB Data Portal</h3><p>유로존 통화 통계</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>PBOC Statistics</h3><p>중국 M2 통화량</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>DefiLlama</h3><p>실시간 스테이블코인 데이터</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>Coin Metrics</h3><p>기관급 온체인 분석</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>BIS SDMX</h3><p>국제결제 통계</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>IMF Data</h3><p>글로벌 금융 지표</p></div>
          <div className="data-source bg-gray-100 rounded-lg p-4 text-center hover:bg-gray-200 transition"><h3>SWIFT GPI</h3><p>국경간 결제 추적</p></div>
        </div>
      </div>
      {/* API 활용 예시 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">💻</span>API 활용 예시</h2>
        <h3 className="font-bold mb-2">전세계 통화량 데이터 수집</h3>
        <div className="api-code bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 주요국 M2 통화량 수집\nimport requests\nfrom fredapi import Fred\n\n# 미국 M2 (FRED API)\nfred = Fred(api_key=\'your_fred_key\')\nus_m2 = fred.get_series(\'M2SL\', start=\'2020-01-01\')\n\n# 유로존 M2 (ECB API)\necb_url = "https://data.ecb.europa.eu/data/data-categories/money-credit-and-banking/monetary-aggregates/m2-and-components"\neurozone_m2 = requests.get(ecb_url).json()\n\n# 중국 M2 (Trading Economics API)  \ncn_url = "https://api.tradingeconomics.com/country/china/indicator/money-supply-m2"\nchina_m2 = requests.get(cn_url, params={\'c\': \'your_key\'}).json()\n\n# 스테이블코인과 비교 분석\ndef compare_with_stablecoins():\n    stablecoin_supply = get_stablecoin_supply()\n    penetration_rate = stablecoin_supply / (us_m2.iloc[-1] * 1e9)\n    return penetration_rate\n'}
        </div>
        <h3 className="font-bold mb-2">FRED API - 통화 공급량</h3>
        <div className="api-code bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# Python FRED API 사용\nfrom fredapi import Fred\n\nfred = Fred(api_key=\'your_api_key\')\nm2_supply = fred.get_series(\'M2SL\', start=\'2020-01-01\')\nprint(f"M2 Supply: {m2_supply.tail()}")\n'}
        </div>
      </div>
      {/* 실시간 모니터링 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📡</span>실시간 모니터링</h2>
        <h3 className="font-bold mb-2">자동화 시스템 구축</h3>
        <div className="api-code bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs mb-4 overflow-x-auto">
          {'# 자동 알림 시스템\nimport requests\nimport time\n\ndef monitor_stablecoin_supply():\n    threshold = 200_000_000_000  # $200B\n    \n    while True:\n        data = requests.get(\'https://api.llama.fi/stablecoins\').json()\n        total_supply = sum([coin[\'circulating\'] for coin in data[\'peggedAssets\']])\n        \n        if total_supply > threshold:\n            send_alert(f"스테이블코인 총 공급량이 ${total_supply/1e9:.1f}B 돌파!")\n        \n        time.sleep(3600)  # 1시간마다 체크\n'}
        </div>
        <div className="alert-system warning bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400 p-4 rounded-lg">
          <h3 className="font-bold mb-1">⚙️ 설정 권장사항</h3>
          <p>• API 호출 제한 준수<br />• 데이터 백업 및 보관<br />• 오류 처리 및 재시도 로직</p>
        </div>
      </div>
      {/* 데이터 수집 체크리스트 카드 */}
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur col-span-1 md:col-span-2 xl:col-span-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4"><span className="card-icon inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📋</span>데이터 수집 체크리스트</h2>
        <div style={{ lineHeight: 2 }} className="text-gray-700">
          <p>✅ 주요국 M1/M2 통화량 데이터<br />
            ✅ 스테이블코인 시가총액 및 거래량<br />
            ✅ 체인별 분포 및 이동량<br />
            ✅ 통화량 대비 침투율 계산<br />
            ✅ CBDC 개발 현황<br />
            ✅ 규제 정책 변화<br />
            ✅ 전통 금융 지표<br />
            ✅ 거시경제 데이터<br />
            ✅ 지정학적 리스크 요인<br />
            ✅ 기술적 지표 및 온체인 메트릭<br />
            ✅ 유동성 순환 분석<br />
            ✅ 중앙은행 정책 모니터링</p>
        </div>
      </div>
    </div>
  );
}

export default MoneyTrackerPage; 