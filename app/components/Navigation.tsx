import Link from 'next/link'

const Navigation = () => {
  return (
    <nav className="bg-[#161b22] border-b border-[#30363d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-yellow-400 font-bold text-xl">
                Bitebi
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  href="/whale-tracker"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Whale Tracker
                </Link>
                <Link
                  href="/news"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  News
                </Link>
                <Link
                  href="/market"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Market
                </Link>
                <Link
                  href="/money-tracker"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  머니트래커
                </Link>
                <Link
                  href="/analysis"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Analysis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation 