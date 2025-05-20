import Image from 'next/image'
import { memo } from 'react'

interface CoinImageProps {
  symbol: string
  size?: number
  className?: string
}

const CoinImage = memo(({ symbol, size = 32, className = '' }: CoinImageProps) => {
  const imageUrl = `https://assets.coingecko.com/coins/images/1/large/${symbol.toLowerCase()}.png`

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={imageUrl}
        alt={`${symbol} logo`}
        fill
        sizes={`${size}px`}
        className="object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = '/images/placeholder.png'
        }}
      />
    </div>
  )
})

CoinImage.displayName = 'CoinImage'

export default CoinImage 