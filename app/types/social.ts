export interface SocialFeed {
  id: string
  title: string
  content: string
  url: string
  author: string
  publishedAt: string
  source: string
  category: 'community' | 'influencer'
  formattedDate: string
  platform: 'reddit' | 'twitter' | 'news'
}

export interface SocialSource {
  name: string
  type: 'reddit' | 'twitter' | 'news'
  url: string
  category: 'community' | 'influencer'
} 