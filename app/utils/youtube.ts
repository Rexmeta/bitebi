import axios from 'axios'
import { YouTubeVideo } from '../types/youtube'

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

// API 키 확인을 위한 로깅 추가
console.log('YouTube API Key:', YOUTUBE_API_KEY ? '설정됨' : '설정되지 않음')

const CHANNEL_IDS = [
  'UCqK_GSMbpiV8spgD3ZGloSw', // Coin Bureau
  'UCbLhGKVY-bJPcawebgtNfbw', // Altcoin Daily
  'UCRvqjQPSeaWn-uEx-w0XOIg', // Benjamin Cowen
  'UCnqZ2hx679DqRi6khRUNw2g'  // TheChartGuys
]

export async function getLatestVideos(): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured')
    throw new Error('YouTube API key is not configured')
  }

  try {
    const videos: YouTubeVideo[] = []
    
    for (const channelId of CHANNEL_IDS) {
      try {
        // 채널 정보 먼저 확인
        const channelResponse = await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          {
            params: {
              part: 'snippet',
              id: channelId,
              key: YOUTUBE_API_KEY
            },
            timeout: 5000
          }
        )

        if (!channelResponse.data.items?.length) {
          console.warn(`Channel ${channelId} not found`)
          continue
        }

        // 최신 비디오 가져오기
        const response = await axios.get(
          'https://www.googleapis.com/youtube/v3/search',
          {
            params: {
              part: 'snippet',
              channelId,
              maxResults: 5,
              order: 'date',
              type: 'video',
              key: YOUTUBE_API_KEY
            },
            timeout: 5000
          }
        )

        if (!response.data.items?.length) {
          console.warn(`No videos found for channel ${channelId}`)
          continue
        }

        const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',')
        const videoDetails = await axios.get(
          'https://www.googleapis.com/youtube/v3/videos',
          {
            params: {
              part: 'statistics,contentDetails',
              id: videoIds,
              key: YOUTUBE_API_KEY
            },
            timeout: 5000
          }
        )

        if (!videoDetails.data.items?.length) {
          console.warn(`No video details found for channel ${channelId}`)
          continue
        }

        const videoStats = videoDetails.data.items.reduce((acc: any, item: any) => {
          acc[item.id] = {
            statistics: item.statistics,
            contentDetails: item.contentDetails
          }
          return acc
        }, {})

        videos.push(
          ...response.data.items.map((item: any): YouTubeVideo => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high.url,
            viewCount: parseInt(videoStats[item.id.videoId]?.statistics?.viewCount || '0'),
            duration: videoStats[item.id.videoId]?.contentDetails?.duration || 'PT0S',
            channelId: item.snippet.channelId
          }))
        )
      } catch (channelError) {
        console.error(`Error fetching videos for channel ${channelId}:`, channelError)
        // Continue with next channel instead of failing completely
        continue
      }
    }

    if (videos.length === 0) {
      throw new Error('No videos could be fetched from any channel')
    }

    return videos.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    throw error
  }
} 