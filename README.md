# INU Timetable Front

인천대학교 시간표 마법사의 React/Vite 프론트엔드입니다. Spring Boot 백엔드와 연동해 과목 검색, 위시리스트, 자동 시간표 조합, 시간표 시각화, PDF 내보내기 흐름을 제공합니다.

Live site: https://inuu-timetable.vercel.app

## Portfolio Highlights

- 실제 학생용 시간표 서비스의 사용자 화면을 React, Vite, Tailwind CSS로 구현했습니다.
- 백엔드 API를 서비스 레이어로 분리해 과목 검색, 인증, 위시리스트, 시간표, 조합 생성 요청을 일관되게 처리했습니다.
- 서버 사이드 페이지네이션과 1000ms debounced search로 대량 과목 데이터 조회 경험을 개선했습니다.
- 시간표 충돌 감지, 과목 색상 체계, 반응형 시간표 그리드, PDF/이미지 export 등 사용자가 바로 체감하는 기능을 구현했습니다.

## My Role

- React SPA 구조 설계 및 UI 구현
- `src/services/api.js` 기반 API service layer 작성
- 로그인/회원가입 context와 localStorage 기반 세션 복원 구현
- 과목 검색/필터링, 위시리스트, 시간표 조합 결과 UI 구현
- 시간표 겹침 감지, 교시 변환, 과목 유형별 색상 체계 구현
- 모바일/데스크톱 반응형 레이아웃과 한국어 UX 문구 구성

## Tech Stack

| Area | Stack |
|---|---|
| Frontend | React 18, Vite, JavaScript |
| Styling | Tailwind CSS, Lucide React |
| State | React Context, hooks |
| API | Fetch API, service layer |
| Export | html2canvas, jsPDF |
| QA | Playwright E2E |
| Deployment | Vercel config |

## Features

### Course Search

- 과목명, 교수명, 학과, 학년, 이수구분, 학점, 요일/시간대 필터
- 서버 사이드 페이지네이션
- 검색어 debounce로 불필요한 API 호출 감소

### Wishlist and Timetable

- 로그인 사용자 기준 위시리스트 저장/삭제
- 우선순위와 필수 과목 조건 관리
- 시간표 추가 전 시간 충돌 감지
- 개인 시간표 조회, 제거, 메모 업데이트

### Combination Results

- 목표 학점과 공강 요일 조건 기반 조합 요청
- 조합별 총 학점, 과목 수, 이수구분 분포 표시
- 조합 결과를 시간표 그리드로 시각화
- 선택한 조합을 내 시간표에 적용

### User Experience

- Korean-first UI copy
- 모바일/데스크톱 반응형 레이아웃
- toast feedback and loading overlay
- PDF export and timetable sharing flow

## API Layer

The app calls the backend through `src/services/api.js`.

```text
VITE_API_BASE_URL=/api
VITE_ADMIN_API_BASE_URL=/admin/api
```

Main API groups:

- `subjectAPI`: subject list, search, filter, and admin-only detail/import mutations
- `adminAuthAPI`: admin login, session restore, logout
- `authAPI`: register, login
- `wishlistAPI`: add, remove, priority, required subjects
- `timetableAPI`: add, remove, memo, clear, get by user
- `combinationAPI`: generate timetable combinations

## Local Setup

```bash
npm install
npm run dev
```

The Vite dev server runs with the backend API expected at `http://localhost:8080/api` or through the configured proxy/deployment path.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test:e2e
```

`npm run test:e2e`는 기본으로 운영 배포 URL(`https://inuu-timetable.vercel.app`)을 대상으로 과목 검색, 회원가입 전공 선택, 비로그인 담기 보호 흐름을 검증합니다. 다른 환경을 확인할 때는 `E2E_BASE_URL`을 지정합니다.

## Related Repositories

- Backend: https://github.com/coldmans/inu_timetable
