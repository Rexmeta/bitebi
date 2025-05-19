'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import dynamic from 'next/dynamic'
import { Topic } from '../types/topic'

interface TopicMapProps {
  topics: Topic[]
  width: number
  height: number
}

interface CloudWord {
  topic: Topic
  color: string
  text: string
  size: number
  x: number
  y: number
  rotate: number
}

const TopicMap = ({ topics, width, height }: TopicMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !svgRef.current || !topics.length) return

    const initializeCloud = async () => {
      try {
        const cloud = (await import('d3-cloud')).default
        
        // 기존 SVG 내용 제거
        d3.select(svgRef.current).selectAll('*').remove()

        // 언급량에 따른 크기 스케일 설정
        const mentionScale = d3.scaleLinear()
          .domain([0, d3.max(topics, d => d.mentionCount) || 0])
          .range([12, 48])

        // 감성 점수에 따른 색상 스케일 설정
        const sentimentScale = d3.scaleLinear<string>()
          .domain([-1, 0, 1])
          .range(['#ef4444', '#6b7280', '#22c55e'])

        // 워드 클라우드 레이아웃 설정
        const layout = cloud()
          .size([width, height])
          .words(topics.map(topic => ({
            text: topic.name,
            size: mentionScale(topic.mentionCount),
            color: sentimentScale(topic.sentiment),
            topic: topic
          } as CloudWord)))
          .padding(5)
          .rotate(() => ~~(Math.random() * 2) * 90)
          .font('Inter')
          .fontSize((d: any) => d.size)
          .on('end', draw)

        layout.start()

        function draw(words: CloudWord[]) {
          const svg = d3.select(svgRef.current)
          
          // 그룹 생성
          const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`)

          // 워드 클라우드 요소 생성
          g.selectAll('text')
            .data(words)
            .enter()
            .append('text')
            .style('font-size', (d: CloudWord) => `${d.size}px`)
            .style('font-family', 'Inter')
            .style('fill', (d: CloudWord) => d.color)
            .attr('text-anchor', 'middle')
            .attr('transform', (d: CloudWord) => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text((d: CloudWord) => d.text)
            .on('mouseover', function(this: SVGTextElement, event: MouseEvent, d: CloudWord) {
              d3.select(this)
                .style('font-weight', 'bold')
                .style('cursor', 'pointer')
            })
            .on('mouseout', function(this: SVGTextElement) {
              d3.select(this)
                .style('font-weight', 'normal')
            })
            .on('click', (event: MouseEvent, d: CloudWord) => {
              setSelectedTopic(d.topic)
            })

          // 툴팁 생성
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', '#1b1f23')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('border', '1px solid #30363d')
            .style('z-index', '1000')
            .style('max-width', '300px')

          // 마우스 이벤트에 툴팁 추가
          g.selectAll<SVGTextElement, CloudWord>('text')
            .on('mouseover', function(this: SVGTextElement, event: MouseEvent, d: CloudWord) {
              const sentiment = d.topic.sentiment
              const sentimentText = sentiment > 0.3 ? '긍정적' : sentiment < -0.3 ? '부정적' : '중립적'
              
              tooltip
                .style('visibility', 'visible')
                .html(`
                  <div class="font-semibold">${d.topic.name}</div>
                  <div class="text-sm text-gray-400">언급: ${d.topic.mentionCount}</div>
                  <div class="text-sm text-gray-400">감성: ${sentimentText} (${sentiment.toFixed(2)})</div>
                  <div class="text-sm text-gray-400">${d.topic.description}</div>
                  ${d.topic.relatedNews.length > 0 ? `
                    <div class="mt-2 text-sm">
                      <div class="font-semibold">관련 뉴스:</div>
                      ${d.topic.relatedNews.slice(0, 2).map(news => `
                        <div class="mt-1">
                          <a href="${news.url}" target="_blank" class="text-blue-400 hover:text-blue-300">
                            ${news.title}
                          </a>
                          <div class="text-xs text-gray-500">${new Date(news.publishedAt).toLocaleDateString()}</div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`)
            })
            .on('mousemove', function(this: SVGTextElement, event: MouseEvent) {
              tooltip
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`)
            })
            .on('mouseout', function(this: SVGTextElement) {
              tooltip.style('visibility', 'hidden')
            })
        }
      } catch (err) {
        console.error('Error initializing cloud:', err)
        setError('토픽 맵을 초기화하는 중 오류가 발생했습니다.')
      }
    }

    initializeCloud()

    return () => {
      d3.select('.tooltip').remove()
    }
  }, [topics, width, height, isClient])

  if (!isClient) {
    return (
      <div className="bg-[#161b22] rounded-lg p-4 text-gray-400">
        로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#161b22] rounded-lg p-4 text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-[#161b22] rounded-lg"
      />
      
      {/* 선택된 토픽 상세 정보 */}
      {selectedTopic && (
        <div className="absolute top-0 right-0 w-80 bg-[#1b1f23] border border-[#30363d] rounded-lg p-4 m-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-yellow-400">{selectedTopic.name}</h3>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400">언급 횟수</div>
              <div className="text-lg">{selectedTopic.mentionCount}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">감성 분석</div>
              <div className="text-lg">
                {selectedTopic.sentiment > 0.3 ? '긍정적' :
                 selectedTopic.sentiment < -0.3 ? '부정적' : '중립적'}
                ({selectedTopic.sentiment.toFixed(2)})
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">관련 뉴스</div>
              <div className="space-y-2 mt-2">
                {selectedTopic.relatedNews.map((news, index) => (
                  <div key={index} className="border-t border-[#30363d] pt-2">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {news.title}
                    </a>
                    <div className="text-xs text-gray-500 mt-1">
                      {news.source} • {new Date(news.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(TopicMap), {
  ssr: false
}) 