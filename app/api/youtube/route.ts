import { NextResponse } from 'next/server'
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

// RSS 피드 파싱
async function parseRSSFeed(feedUrl: string) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
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
    
    if (!result.feed?.entry) {
      return []
    }
    
    const items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry]
    return items.map((item: any) => {
      const videoId = item['yt:videoId'] || ''
      const mediaGroup = item['media:group'] || {}
      const thumbnail = mediaGroup['media:thumbnail'] || {}
      
      return {
        id: videoId,
        title: item.title,
        description: mediaGroup['media:description'] || '',
        publishedAt: item.published,
        channelTitle: item.author?.name || 'Unknown Channel',
        thumbnailUrl: thumbnail.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        formattedDate: new Date(item.published).toLocaleDateString()
      }
    })
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    return []
  }
}

export async function GET() {
  try {
    const videos = []
    let successCount = 0
    
    for (const channelId of CHANNEL_IDS) {
      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        const channelVideos = await parseRSSFeed(feedUrl)
        
        if (channelVideos.length > 0) {
          videos.push(...channelVideos)
          successCount++
        }
      } catch (error) {
        console.error(`Error fetching videos for channel ${channelId}:`, error)
        continue
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch videos from any channel'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      videos: videos.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ).slice(0, 20)
    })
  } catch (error) {
    console.error('Error in YouTube API route:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch videos'
      },
      { status: 500 }
    )
  }
} 