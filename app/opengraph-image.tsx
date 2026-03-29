import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Bitebi - 실시간 암호화폐 뉴스 및 시장 분석'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  let btcPrice = ''
  let btcChange = 0
  let ethPrice = ''
  let ethChange = 0

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc',
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    if (Array.isArray(data)) {
      const btc = data.find((c: any) => c.id === 'bitcoin')
      const eth = data.find((c: any) => c.id === 'ethereum')
      if (btc) {
        btcPrice = `$${btc.current_price.toLocaleString()}`
        btcChange = btc.price_change_percentage_24h || 0
      }
      if (eth) {
        ethPrice = `$${eth.current_price.toLocaleString()}`
        ethChange = eth.price_change_percentage_24h || 0
      }
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d1117',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
          <span style={{ fontSize: 56, fontWeight: 'bold', color: '#f5d100' }}>Bitebi</span>
        </div>
        <div style={{ fontSize: 24, color: '#8b949e', marginBottom: 40 }}>
          실시간 암호화폐 뉴스 및 시장 분석
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          {btcPrice && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 40px',
                backgroundColor: '#161b22',
                borderRadius: 16,
                border: '2px solid #2d333b',
              }}
            >
              <span style={{ fontSize: 20, color: '#8b949e', marginBottom: 8 }}>Bitcoin</span>
              <span style={{ fontSize: 36, fontWeight: 'bold', color: '#fff' }}>{btcPrice}</span>
              <span
                style={{
                  fontSize: 18,
                  color: btcChange >= 0 ? '#16c784' : '#ea3943',
                  marginTop: 8,
                }}
              >
                {btcChange >= 0 ? '▲' : '▼'} {Math.abs(btcChange).toFixed(2)}%
              </span>
            </div>
          )}
          {ethPrice && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 40px',
                backgroundColor: '#161b22',
                borderRadius: 16,
                border: '2px solid #2d333b',
              }}
            >
              <span style={{ fontSize: 20, color: '#8b949e', marginBottom: 8 }}>Ethereum</span>
              <span style={{ fontSize: 36, fontWeight: 'bold', color: '#fff' }}>{ethPrice}</span>
              <span
                style={{
                  fontSize: 18,
                  color: ethChange >= 0 ? '#16c784' : '#ea3943',
                  marginTop: 8,
                }}
              >
                {ethChange >= 0 ? '▲' : '▼'} {Math.abs(ethChange).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
