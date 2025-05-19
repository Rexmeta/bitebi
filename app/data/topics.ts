import { TopicCategory } from '../types/topic'

export const topicCategories: TopicCategory[] = [
  {
    id: 'market',
    name: '시장 동향',
    description: '비트코인 시장 동향과 가격 관련 뉴스',
    topics: [
      {
        id: 'price-action',
        name: '가격 동향',
        description: '비트코인 가격 변동과 시장 분석',
        category: 'market',
        trending: 'up',
        mentionCount: 150,
        lastMentioned: new Date(),
        sentiment: 0.5,
        relatedNews: []
      },
      {
        id: 'market-analysis',
        name: '시장 분석',
        description: '기술적/기본적 분석과 시장 전망',
        category: 'market',
        trending: 'up',
        mentionCount: 120,
        lastMentioned: new Date(),
        sentiment: 0.3,
        relatedNews: []
      },
      {
        id: 'trading-volume',
        name: '거래량',
        description: '거래량 변화와 유동성 분석',
        category: 'market',
        trending: 'neutral',
        mentionCount: 80,
        lastMentioned: new Date(),
        sentiment: 0.1,
        relatedNews: []
      }
    ]
  },
  {
    id: 'technology',
    name: '기술',
    description: '비트코인 기술 발전과 업데이트',
    topics: [
      {
        id: 'lightning-network',
        name: '라이트닝 네트워크',
        description: '비트코인 확장성 솔루션',
        category: 'technology',
        trending: 'up',
        mentionCount: 80,
        lastMentioned: new Date()
      },
      {
        id: 'taproot',
        name: '탭루트',
        description: '비트코인 개선 제안',
        category: 'technology',
        trending: 'neutral',
        mentionCount: 60,
        lastMentioned: new Date()
      }
    ]
  },
  {
    id: 'regulation',
    name: '규제',
    description: '비트코인 관련 규제 뉴스',
    topics: [
      {
        id: 'sec-regulation',
        name: 'SEC 규제',
        description: '미국 증권거래위원회 규제 동향',
        category: 'regulation',
        trending: 'up',
        mentionCount: 200,
        lastMentioned: new Date()
      },
      {
        id: 'global-regulation',
        name: '글로벌 규제',
        description: '전 세계 규제 동향',
        category: 'regulation',
        trending: 'down',
        mentionCount: 180,
        lastMentioned: new Date()
      }
    ]
  }
] 