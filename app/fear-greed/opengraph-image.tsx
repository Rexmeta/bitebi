import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '암호화폐 공포·탐욕 지수 - Bitebi'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function getGaugeColor(value: number): string {
  if (value <= 20) return '#ea3943'
  if (value <= 40) return '#ea8c00'
  if (value <= 60) return '#f5d100'
  if (value <= 80) return '#93c47d'
  return '#16c784'
}

function getClassificationKo(classification: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': '극단적 공포',
    'Fear': '공포',
    'Neutral': '중립',
    'Greed': '탐욕',
    'Extreme Greed': '극단적 탐욕',
  }
  return map[classification] || classification
}

export default async function Image() {
  let value = 50
  let classification = 'Neutral'
  let dateStr = ''

  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    const json = await res.json()
    if (json.data && json.data[0]) {
      value = parseInt(json.data[0].value)
      classification = json.data[0].value_classification
      const ts = parseInt(json.data[0].timestamp) * 1000
      dateStr = new Date(ts).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    }
  } catch {}

  const color = getGaugeColor(value)
  const classKo = getClassificationKo(classification)

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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 40, fontWeight: 'bold', color: '#f5d100' }}>Bitebi</span>
        </div>
        <div style={{ fontSize: 28, color: '#8b949e', marginBottom: 30 }}>
          암호화폐 공포·탐욕 지수
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 220,
            height: 220,
            borderRadius: '50%',
            border: `8px solid ${color}`,
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 80, fontWeight: 'bold', color }}>{value}</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 'bold', color, marginBottom: 10 }}>
          {classKo}
        </div>
        {dateStr && (
          <div style={{ fontSize: 18, color: '#6e7681' }}>
            {dateStr} 기준
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
