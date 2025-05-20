export interface SocialFeed {
  id: string
  title: string
  content: string
  url: string
  author: string
  publishedAt: string
  source: string
  category: 'community' | 'news' | 'education'
  formattedDate: string
  platform: 'reddit' | 'medium' | 'twitter'
}

export interface SocialSource {
  name: string
  type: 'reddit' | 'medium' | 'twitter'
  url: string
  category: 'community' | 'news' | 'education'
} 