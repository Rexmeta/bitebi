'use client'
import React from 'react'

const REGION_LABELS: Record<string, string> = {
  us: '미국',
  eu: '유로존',
  jp: '일본',
  uk: '영국',
}

// 같은 비율을 app/api/monetary/route.ts 의 REGION_PROXY_RATIO 와 맞춘다.
const REGION_PROXY_RATIO: Record<string, number> = { eu: 0.78, jp: 0.36, uk: 0.14 }

export function regionLabel(code: string): string {
  return REGION_LABELS[code] || code.toUpperCase()
}

export function buildGlobalM2EstimateTooltip(missingRegions?: string[] | null): string {
  const regions = (missingRegions || []).filter(r => r in REGION_PROXY_RATIO)
  if (regions.length === 0) {
    return '글로벌 M2 일부가 미국 M2 기반 프록시로 보간된 추정치입니다.'
  }
  const detail = regions
    .map(r => `${regionLabel(r)} ≈ 미국 M2 × ${REGION_PROXY_RATIO[r]}`)
    .join(', ')
  const names = regions.map(r => regionLabel(r)).join(', ')
  return `누락 지역(${names})은 미국 M2 기반 프록시 비율로 보간되었습니다. (${detail})`
}

export default function GlobalM2EstimateBadge({
  estimated,
  missingRegions,
  size = 'sm',
  className = '',
  label = '추정치',
}: {
  estimated?: boolean
  missingRegions?: string[] | null
  size?: 'xs' | 'sm'
  className?: string
  label?: string
}) {
  if (!estimated) return null
  const tooltip = buildGlobalM2EstimateTooltip(missingRegions)
  const sizeCls = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  const regions = (missingRegions || []).filter(r => r in REGION_PROXY_RATIO)
  const suffix = regions.length > 0
    ? ` · 누락 ${regions.map(r => regionLabel(r)).join('/')}`
    : ''
  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeCls} rounded border border-amber-400/30 text-amber-300 bg-amber-400/10 ${className}`}
      title={tooltip}
    >
      <span aria-hidden>⚠</span>
      {label}{suffix}
    </span>
  )
}
