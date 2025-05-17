import axios from 'axios'
import { YouTubeVideo } from '../types/youtube'

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const CHANNEL_IDS = [
  'UCqK_GSMbpiV8spgD3ZGloSw', // aantonop
  'UC6rBxHpzXfV3U6o8nGpzJ8g', // Coin Bureau
  'UCqK_GSMbpiV8spgD3ZGloSw', // Bitcoin.com
  'UCqK_GSMbpiV8spgD3ZGloSw', // Crypto Daily
  'UCqK_GSMbpiV8spgD3ZGloSw'  // Ivan on Tech
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
            }
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
            }
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
    throw error // Re-throw to let the component handle the error
  }
} 