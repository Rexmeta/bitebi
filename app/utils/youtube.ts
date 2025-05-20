import { YouTubeApiResponse, YouTubeApiVideo, YouTubeApiChannel, YouTubeApiError, YouTubeVideo } from '../types/youtube'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'

// 채널 ID 목록
const CHANNEL_IDS = [
  'UCtOV5M-T3GcsJAq8QKaf0lg', // otaverse
  'UCJ5v_MCY6GNUBTO8-D3XoAg', // algoran
  'UCdU1KXQFD2T9QlPR-5mG5tA', // BitcoinMagazine
  'UCWZ_8TWTJ3J6z8TzU-Ih1Cg', // BinanceYoutube
  'UCqK_GSMbpiV8spgD3ZGloSw', // aantonop
  'UC6rBzSz6qQbWnaG3SAkZgOA', // Bitcoin
  'UC6rBzSz6qQbWnaG3SAkZgOA', // Bitcoin.com
  'UC6rBzSz6qQbWnaG3SAkZgOA', // Bitcoin.com News
  'UC6rBzSz6qQbWnaG3SAkZgOA', // Bitcoin.com TV
  'UC6rBzSz6qQbWnaG3SAkZgOA'  // Bitcoin.com Podcast
]

// 유틸리티 함수
export const formatDuration = (duration: string): string => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return '00:00'

  const hours = (match[1] || '').replace('H', '')
  const minutes = (match[2] || '').replace('M', '')
  const seconds = (match[3] || '').replace('S', '')
  
  let result = ''
  if (hours) result += `${hours}:`
  result += `${minutes.padStart(2, '0')}:`
  result += seconds.padStart(2, '0')
  
  return result
}

export const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString()
}

// API 함수
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting API call (${i + 1}/${retries}): ${url}`)
      const response = await fetch(url)
      
      if (response.ok) {
        console.log('API call successful')
        return response
      }
      
      const error: YouTubeApiError = await response.json()
      console.error(`YouTube API Error (attempt ${i + 1}/${retries}):`, error)
      
      if (error.status === 'quotaExceeded') {
        throw new Error('YouTube API quota exceeded')
      }
      
      if (error.status === 'forbidden') {
        throw new Error('Invalid YouTube API key')
      }
      
      lastError = new Error(error.message)
      
      // 지수 백오프로 재시도
      const delay = Math.pow(2, i) * 1000
      console.log(`Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    } catch (error) {
      console.error(`Error during API call (attempt ${i + 1}/${retries}):`, error)
      lastError = error instanceof Error ? error : new Error('Unknown error')
      if (i === retries - 1) break
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries')
}

export async function fetchChannelInfo(channelId: string): Promise<YouTubeApiChannel> {
  const response = await fetchWithRetry(
    `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  )

  const data = await response.json()
  const channel = data.items[0]

  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnailUrl: channel.snippet.thumbnails.default.url,
    subscriberCount: parseInt(channel.statistics.subscriberCount),
    videoCount: parseInt(channel.statistics.videoCount),
    viewCount: parseInt(channel.statistics.viewCount)
  }
}

export async function fetchChannelVideos(
  channelId: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<YouTubeApiResponse> {
  const response = await fetchWithRetry(
    `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`
  )

  const data = await response.json()
  
  return {
    items: data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0
    })),
    nextPageToken: data.nextPageToken,
    pageInfo: data.pageInfo
  }
}

export async function getLatestVideos(): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured')
    throw new Error('YouTube API key is not configured')
  }

  console.log('Starting to fetch latest videos...')
  const videos: YouTubeVideo[] = []
  let successCount = 0
  
  for (const channelId of CHANNEL_IDS) {
    try {
      console.log(`Fetching videos for channel ${channelId}...`)
      
      const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video&key=${YOUTUBE_API_KEY}`
      console.log('Search URL:', searchUrl)
      
      const response = await fetchWithRetry(searchUrl)
      const data = await response.json()
      
      if (!data.items?.length) {
        console.log(`No videos found for channel ${channelId}`)
        continue
      }

      const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
      const detailsUrl = `${YOUTUBE_API_BASE_URL}/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      console.log('Details URL:', detailsUrl)
      
      const videoDetailsResponse = await fetchWithRetry(detailsUrl)
      const videoDetails = await videoDetailsResponse.json()
      
      if (!videoDetails.items?.length) {
        console.log(`No video details found for channel ${channelId}`)
        continue
      }

      const videoStats = videoDetails.items.reduce((acc: any, item: any) => {
        acc[item.id] = {
          statistics: item.statistics,
          contentDetails: item.contentDetails
        }
        return acc
      }, {})

      const channelVideos = data.items.map((item: any): YouTubeVideo => {
        const stats = videoStats[item.id.videoId]
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails.high.url,
          viewCount: parseInt(stats.statistics.viewCount || '0'),
          likeCount: parseInt(stats.statistics.likeCount || '0'),
          commentCount: parseInt(stats.statistics.commentCount || '0'),
          duration: stats.contentDetails.duration,
          channelId: item.snippet.channelId,
          formattedDuration: formatDuration(stats.contentDetails.duration),
          formattedViewCount: formatViewCount(parseInt(stats.statistics.viewCount || '0')),
          formattedDate: formatDate(item.snippet.publishedAt)
        }
      })

      videos.push(...channelVideos)
      successCount++
      console.log(`Successfully fetched ${channelVideos.length} videos from channel ${channelId}`)
      
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