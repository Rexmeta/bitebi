# GitHub Actions 워크플로우 설정 가이드

이 문서는 AI 콘텐츠 자동 생성을 위한 GitHub Actions 워크플로우 파일 설정 방법을 안내합니다.

## 📋 사전 준비

### 1. GitHub Secrets 설정

1. GitHub 저장소로 이동
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 버튼 클릭
4. 다음 Secret 추가:

```
Name: GEMINI_API_KEY
Value: your_google_ai_studio_api_key_here
```

> API 키 발급: https://aistudio.google.com/app/apikey

### 2. GitHub Actions 활성화

- **Settings** → **Actions** → **General**
- "Allow all actions and reusable workflows" 선택
- **Save** 클릭

---

## 📝 워크플로우 파일 생성

GitHub의 workflow 권한 제한으로 인해 다음 파일들을 수동으로 생성해야 합니다.

### 파일 1: `.github/workflows/generate-daily-content.yml`

**경로**: `.github/workflows/generate-daily-content.yml`

**내용**:
```yaml
name: Generate Daily AI Content

on:
  schedule:
    # 매일 한국 시간 오전 9시 (UTC 0시)
    - cron: '0 0 * * *'
  workflow_dispatch: # 수동 실행 가능

jobs:
  generate-content:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate daily content (report + brief)
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: gemini-2.5-flash-lite
          NEXT_PUBLIC_SITE_URL: ${{ secrets.NEXT_PUBLIC_SITE_URL || 'https://bitebi.vercel.app' }}
        run: |
          echo "🤖 Generating daily content..."
          npm run generate:daily
          
      - name: Update content index
        run: |
          echo "📝 Updating content index..."
          npm run update-index
        
      - name: Check for changes
        id: check_changes
        run: |
          git diff --quiet public/content/ || echo "changes=true" >> $GITHUB_OUTPUT
          
      - name: Commit and push changes
        if: steps.check_changes.outputs.changes == 'true'
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add public/content/
          
          DATE=$(date +'%Y-%m-%d')
          git commit -m "chore: Auto-generate daily content for ${DATE} [skip ci]"
          
          git push
        
      - name: Report success
        if: steps.check_changes.outputs.changes == 'true'
        run: echo "✅ Daily content generated and committed successfully!"
        
      - name: No changes detected
        if: steps.check_changes.outputs.changes != 'true'
        run: echo "ℹ️ No new content to commit (already exists)"
```

---

### 파일 2: `.github/workflows/generate-weekly-content.yml`

**경로**: `.github/workflows/generate-weekly-content.yml`

**내용**:
```yaml
name: Generate Weekly AI Content

on:
  schedule:
    # 매주 월요일 한국 시간 오전 9시 (UTC 0시)
    - cron: '0 0 * * 1'
  workflow_dispatch: # 수동 실행 가능
    inputs:
      content_types:
        description: 'Content types to generate (comma-separated: coins,topics,glossary,all)'
        required: false
        default: 'all'

jobs:
  generate-weekly-content:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate weekly content (coins, topics, glossary)
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: gemini-2.5-flash-lite
          NEXT_PUBLIC_SITE_URL: ${{ secrets.NEXT_PUBLIC_SITE_URL || 'https://bitebi.vercel.app' }}
        run: |
          TYPES="${{ github.event.inputs.content_types || 'all' }}"
          echo "🤖 Generating weekly content: ${TYPES}"
          
          if [ "$TYPES" = "all" ]; then
            npm run generate:all
          else
            npm run generate -- --types="${TYPES}"
          fi
          
      - name: Update content index
        run: |
          echo "📝 Updating content index..."
          npm run update-index
        
      - name: Check for changes
        id: check_changes
        run: |
          git diff --quiet public/content/ || echo "changes=true" >> $GITHUB_OUTPUT
          
      - name: Commit and push changes
        if: steps.check_changes.outputs.changes == 'true'
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add public/content/
          
          DATE=$(date +'%Y-%m-%d')
          WEEK=$(date +'%U')
          git commit -m "chore: Auto-generate weekly content (Week ${WEEK}, ${DATE}) [skip ci]"
          
          git push
        
      - name: Report success
        if: steps.check_changes.outputs.changes == 'true'
        run: echo "✅ Weekly content generated and committed successfully!"
        
      - name: No changes detected
        if: steps.check_changes.outputs.changes != 'true'
        run: echo "ℹ️ No new content to commit (already up-to-date)"
```

---

## 🚀 설정 방법

### 옵션 1: GitHub Web UI에서 생성 (권장)

1. GitHub 저장소로 이동
2. **Add file** → **Create new file** 클릭
3. 파일명 입력: `.github/workflows/generate-daily-content.yml`
4. 위 내용 복사하여 붙여넣기
5. **Commit changes** 클릭
6. 같은 방법으로 `generate-weekly-content.yml` 생성

### 옵션 2: 로컬에서 생성 후 직접 커밋

로컬에 파일을 생성한 후, 저장소 소유자가 직접 커밋하고 푸시해야 합니다 (GitHub App 제한으로 인해 일반 사용자는 workflow 파일 푸시 불가).

---

## ✅ 테스트

### 수동 실행으로 테스트

1. GitHub 저장소 → **Actions** 탭
2. 좌측에서 워크플로우 선택:
   - "Generate Daily AI Content"
   - "Generate Weekly AI Content"
3. **Run workflow** 버튼 클릭
4. (선택) 파라미터 입력 후 실행
5. 실행 결과 확인

### 예상 결과

- ✅ public/content/ 디렉토리에 새 JSON 파일 생성
- ✅ index.json 자동 업데이트
- ✅ 자동 커밋 및 푸시
- ✅ 커밋 메시지: "chore: Auto-generate daily/weekly content..."

---

## 🔧 문제 해결

### 워크플로우가 실행되지 않는 경우

1. **Actions 활성화 확인**
   - Settings → Actions → General
   - "Allow all actions" 선택 확인

2. **Secret 설정 확인**
   - Settings → Secrets and variables → Actions
   - `GEMINI_API_KEY` 존재 여부 확인

3. **권한 확인**
   - Settings → Actions → General → Workflow permissions
   - "Read and write permissions" 선택

### 콘텐츠가 생성되지 않는 경우

1. Actions 탭에서 워크플로우 실행 로그 확인
2. GEMINI_API_KEY 유효성 확인
3. API 할당량 확인 (Google AI Studio)

---

## 📊 스케줄

- **일일 콘텐츠**: 매일 오전 9시 (KST) / 자정 (UTC)
  - Daily report
  - Flash brief

- **주간 콘텐츠**: 매주 월요일 오전 9시 (KST)
  - Coin analysis (Bitcoin, Ethereum, Solana)
  - Topic articles (순환 업데이트)
  - Glossary terms (순환 업데이트)

---

## 💡 추가 팁

- **수동 실행**: 테스트나 즉시 생성이 필요할 때 Actions 탭에서 수동 실행
- **파라미터 조정**: `generate-weekly-content.yml`에서 content_types로 특정 타입만 생성 가능
- **스케줄 변경**: cron 표현식 수정으로 실행 시간 조정 가능

---

## 📚 참고 자료

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Cron 표현식 도구](https://crontab.guru/)
- [Google AI Studio](https://aistudio.google.com/)
