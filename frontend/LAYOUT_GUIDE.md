# 📐 Tailwind CSS 레이아웃 가이드

## 🎯 해결된 문제
- **1열 나열 문제 해결**: 모든 요소가 카드형 그리드 레이아웃으로 복구
- **글래스모피즘 스타일 롤백**: 기본 Tailwind CSS 클래스로 재구성
- **VSCode 린트 오류 해결**: Tailwind CSS 인식 설정 추가

## 🛠️ 핵심 클래스들

### 그리드 레이아웃
```css
/* 3열 반응형 그리드 */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

/* 4열 반응형 그리드 */
grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4

/* 2열 반응형 그리드 */
grid grid-cols-1 lg:grid-cols-2 gap-8
```

### 카드 스타일
```css
/* 기본 카드 */
bg-white rounded-lg shadow-sm border border-gray-200 p-6

/* 호버 효과 카드 */
bg-white rounded-lg shadow-sm border border-gray-200 p-6 
transition-all duration-200 hover:shadow-lg hover:-translate-y-1
```

### 플렉스 레이아웃
```css
/* 양쪽 정렬 */
flex items-center justify-between

/* 중앙 정렬 */
flex items-center justify-center

/* 반응형 플렉스 */
flex flex-col sm:flex-row gap-4
```

## 📱 반응형 브레이크포인트

- **Mobile**: 기본 (1열)
- **Tablet**: `md:` 768px+ (2열)
- **Desktop**: `lg:` 1024px+ (3-4열)

## 🎨 컴포넌트별 적용

### Home 페이지
- **통계 섹션**: 3열 그리드
- **인기/최신 대본**: 2열 그리드  
- **감정 카테고리**: 4열 그리드

### 사용자 정의 클래스
```css
.card { /* 기본 카드 스타일 */ }
.card-hover { /* 호버 효과 카드 */ }
.stat-card { /* 통계 카드 */ }
.btn { /* 기본 버튼 */ }
.btn-primary { /* 주요 버튼 */ }
.btn-secondary { /* 보조 버튼 */ }
```

## 🔧 VSCode 설정

### 권장 확장 프로그램
- Tailwind CSS IntelliSense
- PostCSS Language Support
- Auto Rename Tag
- Prettier

### 설정 (`.vscode/settings.json`)
```json
{
  "css.validate": false,
  "css.lint.unknownAtRules": "ignore",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

## 🚀 실행 방법

```bash
# 개발 서버 시작
npm run dev
# 또는
npm start

# 빌드
npm run build

# 린팅
npm run lint
```

## 📋 체크리스트

- ✅ 카드형 레이아웃 복구
- ✅ 반응형 그리드 시스템 적용  
- ✅ VSCode 린트 오류 해결
- ✅ Tailwind CSS 설정 완료
- ✅ 컴포넌트별 스타일 정리
- ✅ 예시 코드 제공

## 🎯 주요 특징

1. **완전 반응형**: 모든 화면 크기에서 최적화
2. **카드 기반 UI**: 일관된 카드 스타일
3. **호버 효과**: 부드러운 인터랙션
4. **접근성**: semantic HTML과 적절한 색상 대비
5. **성능 최적화**: Tailwind CSS JIT 모드 