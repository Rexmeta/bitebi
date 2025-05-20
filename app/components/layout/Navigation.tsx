import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { memo } from 'react'

const Navigation = memo(() => {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '홈' },
    { href: '/topics', label: '토픽' },
    { href: '/social', label: '소셜' },
    { href: '/youtube', label: '유튜브' },
    { href: '/whale-tracker', label: '웨일 트래커' },
    { href: '/stablecoin-tracker', label: '스테이블코인' },
    { href: '/trending', label: '트렌딩' },
    { href: '/news', label: '뉴스' },
    { href: '/aggregator', label: '애그리게이터' }
  ]

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
})

Navigation.displayName = 'Navigation'

export default Navigation 