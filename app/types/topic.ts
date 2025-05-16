export interface Topic {
  id: string
  name: string
  description: string
  category: 'market' | 'technology' | 'regulation' | 'institution' | 'defi' | 'nft'
  trending: 'up' | 'down' | 'neutral'
  mentionCount: number
  lastMentioned: Date
}

export interface TopicCategory {
  id: string
  name: string
  description: string
  topics: Topic[]
} 