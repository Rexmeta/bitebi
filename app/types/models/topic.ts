export interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: string
}

export interface Topic {
  id: string
  name: string
  description: string
  mentions: number
  lastMentioned: Date
  category?: string
  relatedNews?: NewsItem[]
}

export interface TopicCategory {
  id: string
  name: string
  description: string
  topics: Topic[]
}

export interface TopicStats {
  totalMentions: number
  uniqueTopics: number
  topCategories: string[]
  trendingTopics: Topic[]
} 