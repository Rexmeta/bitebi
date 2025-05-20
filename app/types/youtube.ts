// API 응답 타입
export interface YouTubeApiResponse {
  items: YouTubeApiVideo[]
  nextPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

export interface YouTubeApiVideo {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  channelTitle: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration?: string
  channelId?: string
}

export interface YouTubeApiChannel {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  subscriberCount: number
  videoCount: number
  viewCount: number
}

export interface YouTubeApiError {
  code: number
  message: string
  status: string
}

// 컴포넌트에서 사용하는 타입
export interface YouTubeVideo extends YouTubeApiVideo {
  formattedDuration?: string
  formattedViewCount?: string
  formattedDate?: string
}

export interface YouTubeChannel extends YouTubeApiChannel {
  formattedSubscriberCount?: string
  formattedVideoCount?: string
  formattedViewCount?: string
} 