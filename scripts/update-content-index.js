#!/usr/bin/env node
/**
 * 콘텐츠 인덱스 파일 업데이트
 * public/content/index.json 생성
 */

const fs = require('fs')
const path = require('path')

const CONTENT_ROOT = path.join(process.cwd(), 'public', 'content')

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse()
}

const index = {
  lastUpdated: new Date().toISOString(),
  dailyReports: listJsonFiles(path.join(CONTENT_ROOT, 'daily-reports')),
  coinAnalyses: listJsonFiles(path.join(CONTENT_ROOT, 'coin-analysis')),
  topics: listJsonFiles(path.join(CONTENT_ROOT, 'topics')),
  glossaryTerms: listJsonFiles(path.join(CONTENT_ROOT, 'glossary')),
  flashBriefs: listJsonFiles(path.join(CONTENT_ROOT, 'flash-briefs')),
}

fs.mkdirSync(CONTENT_ROOT, { recursive: true })
fs.writeFileSync(
  path.join(CONTENT_ROOT, 'index.json'),
  JSON.stringify(index, null, 2),
  'utf-8'
)

console.log('✅ 인덱스 업데이트 완료:')
console.log(`  daily-reports: ${index.dailyReports.length}개`)
console.log(`  coin-analysis: ${index.coinAnalyses.length}개`)
console.log(`  topics: ${index.topics.length}개`)
console.log(`  glossary: ${index.glossaryTerms.length}개`)
console.log(`  flash-briefs: ${index.flashBriefs.length}개`)
