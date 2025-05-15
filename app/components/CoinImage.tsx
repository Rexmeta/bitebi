import Image from 'next/image'

interface CoinImageProps {
  src: string
  alt: string
  size?: number
}

export default function CoinImage({ src, alt, size = 32 }: CoinImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full"
      loading="lazy"
    />
  )
} 