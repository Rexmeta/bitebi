export interface Topic {
  id: string
  name: string
  description: string
  category: 'market' | 'technology' | 'regulation' | 'institution' | 'defi' | 'nft'
  trending: 'up' | 'down' | 'neutral'
  mentionCount: number
  lastMentioned: Date
  sentiment: number // -1 to 1
  relatedNews: {
    title: string
    url: string
    publishedAt: Date
    source: string
  }[]
}

export interface TopicCategory {
  id: string
  name: string
  description: string
  topics: Topic[]
} 