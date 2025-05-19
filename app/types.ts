export interface Topic {
  id: string
  name: string
  description: string
  mentions: number
  lastMentioned: Date
  category?: string
  relatedNews?: {
    title: string
    url: string
    source: string
    publishedAt: string
  }[]
} 