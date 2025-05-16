const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_IDS = [
  'UCqK_GSMbpiV8spgD3ZGloSw', // Coin Bureau
  'UCdUSSt-IEUg2eq46rD7lu_g', // Crypto Daily
  'UC6ZQ-SuhvM79X8Uq1-dV12A', // Crypto Banter
  'UCqK_GSMbpiV8spgD3ZGloSw', // Bitcoin.com
  'UCdUSSt-IEUg2eq46rD7lu_g'  // Bitcoin Magazine
]

export async function getLatestVideos(): Promise<YouTubeVideo[]> {
  try {
    const videos: YouTubeVideo[] = []
    
    for (const channelId of CHANNEL_IDS) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `channelId=${channelId}&` +
        `maxResults=5&` +
        `order=date&` +
        `type=video&` +
        `key=${YOUTUBE_API_KEY}`
      )
      
      const data = await response.json()
      
      if (data.items) {
        for (const item of data.items) {
          // 비디오 상세 정보 가져오기
          const videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?` +
            `part=contentDetails,statistics&` +
            `id=${item.id.videoId}&` +
            `key=${YOUTUBE_API_KEY}`
          )
          
          const videoData = await videoResponse.json()
          
          if (videoData.items && videoData.items[0]) {
            const video = videoData.items[0]
            videos.push({
              id: item.id.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnailUrl: item.snippet.thumbnails.high.url,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              viewCount: parseInt(video.statistics.viewCount),
              duration: video.contentDetails.duration,
              channelId: item.snippet.channelId
            })
          }
        }
      }
    }
    
    // 최신순으로 정렬
    return videos.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return []
  }
} 