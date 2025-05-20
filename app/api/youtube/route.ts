import { NextResponse } from 'next/server'
import { getLatestVideos } from '@/app/utils/youtube'

export async function GET() {
  try {
    const videos = await getLatestVideos()
    return NextResponse.json({ success: true, videos })
  } catch (error) {
    console.error('YouTube API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch videos'
      },
      { status: 500 }
    )
  }
} 