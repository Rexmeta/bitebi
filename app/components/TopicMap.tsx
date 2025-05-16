'use client'
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Topic } from '../types/topic'

interface TopicMapProps {
  topics: Topic[]
  width: number
  height: number
}

export default function TopicMap({ topics, width, height }: TopicMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !topics.length) return

    // 기존 SVG 내용 제거
    d3.select(svgRef.current).selectAll('*').remove()

    // 언급량에 따른 크기 스케일 설정
    const mentionScale = d3.scaleLinear()
      .domain([0, d3.max(topics, d => d.mentionCount) || 0])
      .range([12, 48]) // 폰트 크기 범위

    // 색상 스케일 설정
    const colorScale = d3.scaleOrdinal()
      .domain(['up', 'down', 'neutral'])
      .range(['#22c55e', '#ef4444', '#6b7280'])

    // 워드 클라우드 레이아웃 설정
    const layout = d3.layout.cloud()
      .size([width, height])
      .words(topics.map(topic => ({
        text: topic.name,
        size: mentionScale(topic.mentionCount),
        color: colorScale(topic.trending),
        topic: topic
      })))
      .padding(5)
      .rotate(() => ~~(Math.random() * 2) * 90)
      .font('Inter')
      .fontSize(d => d.size)
      .on('end', draw)

    layout.start()

    function draw(words: any[]) {
      const svg = d3.select(svgRef.current)
      
      // 그룹 생성
      const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`)

      // 워드 클라우드 요소 생성
      g.selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Inter')
        .style('fill', d => d.color)
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text)
        .on('mouseover', function(event, d) {
          d3.select(this)
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
        })
        .on('mouseout', function() {
          d3.select(this)
            .style('font-weight', 'normal')
        })
        .on('click', (event, d) => {
          // 토픽 상세 정보 표시
          showTopicDetails(d.topic)
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

      // 마우스 이벤트에 툴팁 추가
      g.selectAll('text')
        .on('mouseover', function(event, d) {
          tooltip
            .style('visibility', 'visible')
            .html(`
              <div class="font-semibold">${d.topic.name}</div>
              <div class="text-sm text-gray-400">언급: ${d.topic.mentionCount}</div>
              <div class="text-sm text-gray-400">${d.topic.description}</div>
            `)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY + 10}px`)
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY + 10}px`)
        })
        .on('mouseout', function() {
          tooltip.style('visibility', 'hidden')
        })
    }

    return () => {
      // 컴포넌트 언마운트 시 툴팁 제거
      d3.select('.tooltip').remove()
    }
  }, [topics, width, height])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-[#161b22] rounded-lg"
    />
  )
}

// 토픽 상세 정보 표시 함수
function showTopicDetails(topic: Topic) {
  // 모달이나 사이드바로 토픽 상세 정보를 표시하는 로직
  console.log('Topic details:', topic)
} 