import { NextResponse } from 'next/server'
import { getLatestVideos } from '@/app/utils/youtube'

export async function GET() {
  try {
    console.log('YouTube API route called')
    
    // API 키 확인
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('YouTube API key is not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: 'YouTube API key is not configured'
        },
        { status: 500 }
      )
    }

    console.log('Fetching latest videos...')
    const videos = await getLatestVideos()
    
    if (!videos || videos.length === 0) {
      console.error('No videos fetched')
      return NextResponse.json(
        { 
          success: false, 
          error: 'No videos available'
        },
        { status: 404 }
      )
    }

    console.log(`Successfully fetched ${videos.length} videos`)
    return NextResponse.json({ success: true, videos })
  } catch (error) {
    console.error('YouTube API Error:', error)
    
    // 에러 타입에 따른 처리
    if (error instanceof Error) {
      if (error.message.includes('quotaExceeded')) {
        console.error('YouTube API quota exceeded')
        return NextResponse.json(
          { 
            success: false, 
            error: 'YouTube API quota exceeded'
          },
          { status: 429 }
        )
      }
      
      if (error.message.includes('API key')) {
        console.error('Invalid YouTube API key')
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid YouTube API key'
          },
          { status: 401 }
        )
      }
      
      if (error.message.includes('Failed to fetch videos from any channel')) {
        console.error('Failed to fetch videos from any channel')
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to fetch videos from any channel'
          },
          { status: 404 }
        )
      }
    }

    console.error('Unknown error occurred')
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch videos'
      },
      { status: 500 }
    )
  }
} 