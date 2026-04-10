import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { readContent, writeContent, isCacheStale } from '../../../lib/contentStore'
import type { YouTubeChannel, YouTubeVideo, YouTubeCategory, YouTubeLanguage } from '../../types'

// media:group 네임스페이스를 파싱하기 위한 커스텀 필드 설정
type MediaThumbnail = {
  $: { url: string; width: string; height: string }
}

type MediaGroup = {
  'media:thumbnail'?: MediaThumbnail[]
  'media:description'?: string[]
  'media:title'?: string[]
}

type CustomItem = {
  id?: string
  title?: string
  link?: string
  isoDate?: string
  pubDate?: string
  author?: string
  contentSnippet?: string
  'media:group'?: MediaGroup
}

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ['media:group', 'media:group'],
    ],
  },
})

const CHANNELS: YouTubeChannel[] = [
  // 한국어 채널
  { id: 'UCzbpiKRG28T50WlNEzNlSIQ', name: '크립토 팩트', language: 'ko', category: '시장 분석' },
  { id: 'UCLo-Trw-byo_n4tXb6631Ng', name: '크립토 톡스', language: 'ko', category: '뉴스' },
  { id: 'UCxfPHtfRL4gwxo3U1sY_cXw', name: '크립토 머니랩', language: 'ko', category: '시장 분석' },
  { id: 'UCcE8ajx3I2N-FF0-9GOEJbA', name: '코인만랩', language: 'ko', category: '뉴스' },
  { id: 'UC-oJfTuiIIs5fQpxQvZD8DA', name: '웹3 스쿨', language: 'ko', category: '교육/입문' },
  { id: 'UCaxivA1QU3kAyMAnvls1Ssw', name: '재핀', language: 'ko', category: '시장 분석' },
  { id: 'UC7uFGmwzzXok18RdOh9FDfQ', name: 'algoran 알고란', language: 'ko', category: '기술/개발' },
  
  // 글로벌 채널 (English)
  { id: 'UCqK_GSMbpiV8spgD3ZGloSw', name: 'Coin Bureau', language: 'en', category: '교육/입문' },
  { id: 'UCAl9Ld79qaZxp9Jz67Eiepw', name: 'Bankless', language: 'en', category: '시장 분석' },
  { id: 'UChS97vX6vO7_eizD7E5669A', name: 'InvestAnswers', language: 'en', category: '시장 분석' },
  { id: 'UCXGqKmsP3GTo73v5V6_m39w', name: 'Whiteboard Crypto', language: 'en', category: '교육/입문' },
  { id: 'UCRvqjQPSeaWn-uEx-w0XOIg', name: 'Benjamin Cowen', language: 'en', category: '시장 분석' },
  { id: 'UCbLhGKVY-bJPcawebgtNfbw', name: 'Altcoin Daily', language: 'en', category: '뉴스' },
  { id: 'UCMtJYS0PrtiUwlk6zjGDEMA', name: 'EllioTrades', language: 'en', category: '시장 분석' },
  { id: 'UCCatR7nWbYrkVXdxXb4cGXw', name: 'DataDash', language: 'en', category: '시장 분석' },
  { id: 'UCG5S-tVCO-Z-rN1p1mS_Nyg', name: 'Miles Deutscher', language: 'en', category: '시장 분석' },
  { id: 'UCO76dJ6X0-v_vyX_928pIgw', name: 'Crypto Banter', language: 'en', category: '뉴스' },
  { id: 'UCY0xL8V6NzzFcwzHCgB8orQ', name: 'Dapp University', language: 'en', category: '기술/개발' },
]

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * 썸네일 URL 우선순위 체인을 반환합니다.
 * maxresdefault → sddefault → hqdefault → mqdefault 순으로 시도
 * RSS media:thumbnail URL을 우선 사용하고, 없을 경우 표준 URL 생성
 */
function buildThumbnailUrl(videoId: string, rssThumbnailUrl?: string): string {
  // RSS에서 제공하는 실제 썸네일 URL 우선 사용
  if (rssThumbnailUrl) {
    return rssThumbnailUrl
  }
  // fallback: 표준 hqdefault 썸네일 URL
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * 썸네일 URL 폴백 배열을 반환합니다 (API 응답에 포함되어 클라이언트에서 활용)
 * maxresdefault는 일부 영상에서 없을 수 있으므로 hqdefault를 기본값으로
 */
function buildThumbnailFallbacks(videoId: string): string[] {
  return [
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
  ]
}

async function getChannelVideos(channel: YouTubeChannel): Promise<YouTubeVideo[]> {
  const cacheKey = `channel_${channel.id}`
  
  // 1. Check file cache
  if (!isCacheStale('youtube-cache', cacheKey, CACHE_TTL)) {
    const cached = readContent<YouTubeVideo[]>('youtube-cache', cacheKey)
    if (cached) return cached
  }

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`
    const feed = await parser.parseURL(feedUrl)

    if (!feed.items || feed.items.length === 0) {
      // Fallback to stale cache if available
      return readContent<YouTubeVideo[]>('youtube-cache', cacheKey) || []
    }

    const videos: YouTubeVideo[] = feed.items.map(item => {
      const videoId = item.id?.split(':').pop() || ''

      // RSS의 media:group > media:thumbnail에서 실제 썸네일 URL 추출
      const rssThumbnailUrl = item['media:group']?.['media:thumbnail']?.[0]?.['$']?.url

      return {
        id: videoId,
        title: item.title || '',
        description: item.contentSnippet || '',
        publishedAt: item.isoDate || '',
        channelTitle: feed.title || channel.name,
        thumbnailUrl: buildThumbnailUrl(videoId, rssThumbnailUrl),
        thumbnailFallbacks: buildThumbnailFallbacks(videoId),
        formattedDate: new Date(item.isoDate || '').toLocaleDateString('ko-KR'),
        category: channel.category,
        language: channel.language,
        channelId: channel.id,
      }
    })

    // 2. Write to file cache
    writeContent('youtube-cache', cacheKey, videos)
    return videos
  } catch (error) {
    console.error(`Error fetching RSS for ${channel.name}:`, error)
    // 3. Last fallback: return stale cache even if TTL expired
    return readContent<YouTubeVideo[]>('youtube-cache', cacheKey) || []
  }
}

export const dynamic = 'force-dynamic'

const VALID_LANGUAGES: YouTubeLanguage[] = ['ko', 'en']
const VALID_CATEGORIES: YouTubeCategory[] = ['시장 분석', '교육/입문', '뉴스', '기술/개발']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const languageParam = searchParams.get('language')
    const categoryParam = searchParams.get('category')
    const channelIdParam = searchParams.get('channelId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

    const language: YouTubeLanguage | null = languageParam && VALID_LANGUAGES.includes(languageParam as YouTubeLanguage)
      ? (languageParam as YouTubeLanguage)
      : null
    const category: YouTubeCategory | null = categoryParam && VALID_CATEGORIES.includes(categoryParam as YouTubeCategory)
      ? (categoryParam as YouTubeCategory)
      : null

    let filteredChannels = CHANNELS
    if (language) {
      filteredChannels = filteredChannels.filter(c => c.language === language)
    }
    if (category) {
      filteredChannels = filteredChannels.filter(c => c.category === category)
    }
    if (channelIdParam) {
      filteredChannels = filteredChannels.filter(c => c.id === channelIdParam)
    }

    // Process channels in small chunks to avoid burst blocks, 
    // but with file caching, most will be fast.
    const CHUNK_SIZE = 5
    let allVideos: YouTubeVideo[] = []
    
    for (let i = 0; i < filteredChannels.length; i += CHUNK_SIZE) {
      const chunk = filteredChannels.slice(i, i + CHUNK_SIZE)
      const chunkResults = await Promise.all(chunk.map(ch => getChannelVideos(ch)))
      allVideos = [...allVideos, ...chunkResults.flat()]
    }

    allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    const total = allVideos.length
    const start = (page - 1) * limit
    const paginatedVideos = allVideos.slice(start, start + limit)

    // Highlights (latest video from each channel)
    const highlightMap = new Map<string, YouTubeVideo>()
    for (const v of allVideos) {
      if (!highlightMap.has(v.channelId)) {
        highlightMap.set(v.channelId, v)
      }
    }
    const highlights = Array.from(highlightMap.values()).slice(0, 10)

    return NextResponse.json({
      success: true,
      videos: paginatedVideos,
      highlights,
      channels: CHANNELS,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error in YouTube API route:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
