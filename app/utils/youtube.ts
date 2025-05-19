import axios from 'axios'
import { YouTubeVideo } from '../types/youtube'

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

// API 키 확인을 위한 로깅 추가
console.log('YouTube API Key:', YOUTUBE_API_KEY ? '설정됨' : '설정되지 않음')

const CHANNEL_HANDLES = [
  'otaverse',
  'algoran',
  'BitcoinMagazine',
  'BinanceYoutube'
]

async function getChannelIdFromHandle(handle: string): Promise<string | null> {
  try {
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          part: 'id',
          forHandle: handle,
          key: YOUTUBE_API_KEY
        },
        timeout: 5000
      }
    )

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id
    }
    return null
  } catch (error) {
    console.error(`Error fetching channel ID for handle ${handle}:`, error)
    return null
  }
}

export async function getLatestVideos(): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured')
    throw new Error('YouTube API key is not configured')
  }

  try {
    const videos: YouTubeVideo[] = []
    
    // Get channel IDs from handles
    const channelIds = await Promise.all(
      CHANNEL_HANDLES.map(handle => getChannelIdFromHandle(handle))
    )
    
    // Filter out null values
    const validChannelIds = channelIds.filter((id): id is string => id !== null)
    
    for (const channelId of validChannelIds) {
      try {
        console.log(`Fetching channel info for ${channelId}...`)
        
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

        console.log(`Fetching videos for channel ${channelId}...`)
        
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
        console.log(`Fetching video details for ${videoIds}...`)
        
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

        const channelVideos = response.data.items.map((item: any): YouTubeVideo => ({
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

        console.log(`Successfully fetched ${channelVideos.length} videos for channel ${channelId}`)
        videos.push(...channelVideos)
        
      } catch (channelError: any) {
        console.error(`Error fetching videos for channel ${channelId}:`, {
          message: channelError.message,
          response: channelError.response?.data,
          status: channelError.response?.status
        })
        continue
      }
    }

    if (videos.length === 0) {
      console.error('No videos could be fetched from any channel')
      throw new Error('No videos could be fetched from any channel')
    }

    console.log(`Successfully fetched total ${videos.length} videos`)
    return videos.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error: any) {
    console.error('Error fetching YouTube videos:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    throw error
  }
} 