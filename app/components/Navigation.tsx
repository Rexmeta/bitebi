import Link from 'next/link'

const Navigation = () => {
  return (
    <div className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex-shrink-0 flex items-center">
              {/* Whale Tracker Link */}
              <Link
                href="/whale-tracker"
                className="text-gray-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                고래 트래커
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Navigation 