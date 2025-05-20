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
  platform: 'reddit' | 'twitter'
}

export interface SocialSource {
  name: string
  type: 'reddit' | 'twitter'
  url: string
  category: 'community' | 'influencer'
} 