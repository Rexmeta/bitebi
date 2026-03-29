'use client'

interface ShareButtonsProps {
  url?: string
  title?: string
  description?: string
  className?: string
}

export default function ShareButtons({ url, title, description, className = '' }: ShareButtonsProps) {
  const getShareUrl = () => {
    if (typeof window === 'undefined') return ''
    return url || window.location.href
  }

  const getTitle = () => {
    return title || document.title
  }

  const shareTwitter = () => {
    const shareUrl = getShareUrl()
    const text = getTitle()
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    )
  }

  const shareTelegram = () => {
    const shareUrl = getShareUrl()
    const text = getTitle()
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    )
  }

  const shareKakao = () => {
    const shareUrl = getShareUrl()
    const text = getTitle()
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    window.open(kakaoUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      alert('링크가 복사되었습니다!')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = getShareUrl()
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('링크가 복사되었습니다!')
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-400 mr-1">공유:</span>
      <button
        onClick={shareTwitter}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1DA1F2] hover:bg-[#1a8cd8] transition-colors"
        aria-label="트위터로 공유"
        title="X (Twitter)"
      >
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </button>
      <button
        onClick={shareKakao}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FEE500] hover:bg-[#e6cf00] transition-colors"
        aria-label="카카오톡으로 공유"
        title="카카오톡"
      >
        <svg className="w-5 h-5 text-[#191919]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.858 1.893 5.37 4.737 6.79-.153.562-.986 3.628-1.018 3.855 0 0-.02.167.089.231.108.065.237.015.237.015.312-.044 3.636-2.381 4.213-2.791.56.083 1.14.125 1.742.125 5.523 0 10-3.582 10-8s-4.477-8-10-8z"/>
        </svg>
      </button>
      <button
        onClick={shareTelegram}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0088cc] hover:bg-[#007ab8] transition-colors"
        aria-label="텔레그램으로 공유"
        title="Telegram"
      >
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </button>
      <button
        onClick={copyLink}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#374151] hover:bg-[#4b5563] transition-colors"
        aria-label="링크 복사"
        title="링크 복사"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>
  )
}
