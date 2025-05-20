import axios from 'axios'
import { YouTubeVideo, YouTubeChannel, YouTubeResponse, YouTubeError } from '../types/api/youtube'

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'

// API 키 확인을 위한 로깅 추가
console.log('YouTube API Key:', YOUTUBE_API_KEY ? '설정됨' : '설정되지 않음')

// 채널 ID를 직접 사용하도록 변경
const CHANNEL_IDS = [
  'UCtOV5M-T3GcsJAq8QKaf0lg', // otaverse
  'UCJ5v_MCY6GNUBTO8-D3XoAg', // algoran
  'UCdU1KXQFD2T9QlPR-5mG5tA', // BitcoinMagazine
  'UCWZ_8TWTJ3J6z8TzU-Ih1Cg'  // BinanceYoutube
]

export async function fetchChannelInfo(channelId: string): Promise<YouTubeChannel> {
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  )
  
  if (!response.ok) {
    const error: YouTubeError = await response.json()
    throw new Error(`Failed to fetch channel info: ${error.message}`)
  }

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
): Promise<YouTubeResponse> {
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`
  )

  if (!response.ok) {
    const error: YouTubeError = await response.json()
    throw new Error(`Failed to fetch videos: ${error.message}`)
  }

  const data = await response.json()
  
  return {
    items: data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: 0, // These will be populated by fetchVideoDetails
      likeCount: 0,
      commentCount: 0
    })),
    nextPageToken: data.nextPageToken,
    pageInfo: data.pageInfo
  }
}

export async function fetchVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
  )

  if (!response.ok) {
    const error: YouTubeError = await response.json()
    throw new Error(`Failed to fetch video details: ${error.message}`)
  }

  const data = await response.json()
  
  return data.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high.url,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics.viewCount),
    likeCount: parseInt(item.statistics.likeCount),
    commentCount: parseInt(item.statistics.commentCount)
  }))
}

export async function getLatestVideos(): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key is not configured')
  }

  const videos: YouTubeVideo[] = []
  
  for (const channelId of CHANNEL_IDS) {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${YOUTUBE_API_KEY}`
      )

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      if (!data.items?.length) {
        continue
      }

      const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
      
      const videoDetailsResponse = await fetch(
        `${YOUTUBE_API_BASE_URL}/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      )

      if (!videoDetailsResponse.ok) {
        continue
      }

      const videoDetails = await videoDetailsResponse.json()
      if (!videoDetails.items?.length) {
        continue
      }

      const videoStats = videoDetails.items.reduce((acc: any, item: any) => {
        acc[item.id] = item.statistics
        return acc
      }, {})

      const channelVideos = data.items.map((item: any): YouTubeVideo => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        viewCount: parseInt(videoStats[item.id.videoId]?.viewCount || '0'),
        likeCount: parseInt(videoStats[item.id.videoId]?.likeCount || '0'),
        commentCount: parseInt(videoStats[item.id.videoId]?.commentCount || '0')
      }))

      videos.push(...channelVideos)
      
    } catch (error) {
      continue
    }
  }

  if (videos.length === 0) {
    throw new Error('No videos could be fetched from any channel')
  }

  return videos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
} 