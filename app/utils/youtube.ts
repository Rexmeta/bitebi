import { YouTubeVideo } from '../types/youtube'
import { XMLParser } from 'fast-xml-parser'

// 채널 ID 목록
const CHANNEL_IDS = [
  'UCtOV5M-T3GcsJAq8QKaf0lg', // otaverse
  'UCJ5v_MCY6GNUBTO8-D3XoAg', // algoran
  'UCdU1KXQFD2T9QlPR-5mG5tA', // BitcoinMagazine
  'UCWZ_8TWTJ3J6z8TzU-Ih1Cg', // BinanceYoutube
  'UCqK_GSMbpiV8spgD3ZGloSw', // aantonop
  'UC6rBzSz6qQbWnaG3SAkZgOA'  // Bitcoin.com
]

// 유틸리티 함수
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString()
}

// RSS 피드에서 비디오 ID 추출
function extractVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : ''
}

// RSS 피드 파싱
async function parseRSSFeed(feedUrl: string): Promise<YouTubeVideo[]> {
  try {
    console.log('Fetching RSS feed:', feedUrl)
    const response = await fetch(feedUrl)
    
    if (!response.ok) {
      console.error('Failed to fetch RSS feed:', response.status, response.statusText)
      return []
    }
    
    const xml = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    
    const result = parser.parse(xml)
    console.log('RSS feed parsed successfully')
    
    if (!result.feed?.entry) {
      console.log('No entries found in RSS feed')
      return []
    }
    
    const items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry]
    return items.map((item: any) => {
      const videoId = extractVideoId(item.link.href)
      const mediaGroup = item['media:group'] || {}
      const thumbnail = mediaGroup['media:thumbnail'] || {}
      
      return {
        id: videoId,
        title: item.title,
        description: mediaGroup['media:description'] || '',
        publishedAt: item.published,
        channelTitle: item.author?.name || 'Unknown Channel',
        thumbnailUrl: thumbnail.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        duration: '',
        channelId: '',
        formattedDuration: '',
        formattedViewCount: '0',
        formattedDate: formatDate(item.published)
      }
    })
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    return []
  }
}

export async function getLatestVideos(): Promise<YouTubeVideo[]> {
  console.log('Starting to fetch latest videos from RSS feeds...')
  const videos: YouTubeVideo[] = []
  let successCount = 0
  
  for (const channelId of CHANNEL_IDS) {
    try {
      console.log(`Fetching videos for channel ${channelId}...`)
      // YouTube 채널 RSS 피드 URL 형식 수정
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      
      const channelVideos = await parseRSSFeed(feedUrl)
      if (channelVideos.length > 0) {
        videos.push(...channelVideos)
        successCount++
        console.log(`Successfully fetched ${channelVideos.length} videos from channel ${channelId}`)
      } else {
        console.log(`No videos found for channel ${channelId}`)
      }
    } catch (error) {
      console.error(`Error fetching videos for channel ${channelId}:`, error)
      continue
    }
  }

  if (successCount === 0) {
    console.error('Failed to fetch videos from any channel')
    throw new Error('Failed to fetch videos from any channel')
  }

  if (videos.length === 0) {
    console.error('No videos could be fetched from any channel')
    throw new Error('No videos could be fetched from any channel')
  }

  console.log(`Successfully fetched total ${videos.length} videos`)
  return videos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ).slice(0, 20) // 최대 20개의 비디오만 반환
} 