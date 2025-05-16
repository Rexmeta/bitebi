import { NextResponse } from 'next/server'
import { getSocialFeeds } from '@/app/utils/social-feeds'

export async function GET() {
  try {
    const feeds = await getSocialFeeds()
    return NextResponse.json(feeds)
  } catch (error) {
    console.error('Error in social feeds API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social feeds' },
      { status: 500 }
    )
  }
} 