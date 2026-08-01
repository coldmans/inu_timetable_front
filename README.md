# INU Timetable Front

인천대학교 학생을 위한 시간표 마법사의 React/Vite 프론트엔드입니다. Spring Boot 백엔드와 연동해 과목 검색, 위시리스트, 시간표 관리, 자동 조합, 이미지 저장을 제공합니다.

Live site: https://inuu-timetable.vercel.app

## Current Behavior

### Semester and Course Search

- 앱을 그리기 전에 `GET /api/settings/current-semester`로 현재 학기를 읽습니다. 2.5초 안에 응답하지 않거나 요청이 실패하면 번들 기본값 `2026-2`를 사용합니다.
- 과목명, 교수명, 과목코드와 학과, 이수구분, 학년, 학점, 요일/시간 조건을 서버에서 검색합니다.
- 검색어는 데스크톱의 Enter/검색 버튼 또는 모바일 검색 시트의 Enter/최근 검색어 선택으로 제출합니다. 검색어 debounce는 사용하지 않습니다.
- 필터 변경은 첫 페이지를 다시 요청합니다. 서버 응답은 페이지당 20개를 기준으로 처리합니다.
- 모바일은 시간표를 먼저 보여주고 검색/필터 시트와 무한 스크롤을 사용합니다. 데스크톱은 검색 폼, 필터, 페이지 번호 이동을 사용합니다.

### Wishlist, Timetable, and Combinations

- 로그인 사용자는 과목을 위시리스트 또는 내 시간표에 저장하고 시간 충돌을 확인할 수 있습니다.
- 강의 일정의 `roomSegments`를 보존해 한 일정에 여러 강의실이 있는 경우에도 검색 결과, 상세 화면, 시간표에서 강의실을 표시합니다.
- 위시리스트의 필수 과목과 희망 공강 요일을 조합 조건으로 사용합니다.
- 목표 학점은 12~24학점 중 선택할 수 있고, `상관없음`을 선택하면 정확한 목표 학점 없이 조합을 요청합니다.
- 시간표 저장은 `html2canvas`를 필요할 때 동적으로 불러와 PNG 파일을 만듭니다. PDF/jsPDF 내보내기는 제공하지 않습니다.

### Updates and Inquiries

- `업데이트 소식`은 서버의 과목 반영 이력을 불러오고, 서버 UTC 시각을 `Asia/Seoul` 기준으로 표시합니다.
- `문의하기`는 로그인 여부와 관계없이 앱 안에서 제출할 수 있습니다. 로그인 상태에서는 세션 사용자 정보가 함께 연결되고 연락처는 선택 입력입니다.
- 문의 화면은 관리자가 공개한 FAQ가 있을 때만 FAQ 섹션을 표시합니다.

## Authentication and API Boundaries

사용자 인증의 기준은 서버 세션 쿠키입니다.

- 앱 시작 시 `GET /api/auth/me`를 `credentials: include`로 호출해 세션을 복원합니다.
- `localStorage.user`는 서버가 확인한 마지막 사용자 프로필의 보조 mirror이며 인증의 원본이 아닙니다.
- 인증된 사용자/관리자 변경 요청은 `GET /api/auth/csrf`로 `XSRF-TOKEN`을 준비하고 `X-XSRF-TOKEN` 헤더로 전송합니다. 403 응답이면 토큰을 한 번 갱신해 재시도합니다. 로그인, 회원가입, 공개 문의처럼 별도 계약을 가진 요청은 각 API 구현을 따릅니다.
- `src/services/api.js`는 공개/학생 API(기본 `/api`), `src/services/adminApi.js`는 관리자 API(기본 `/admin/api`)를 담당합니다.

`/admin/subjects` UI는 개발 모드에서만 동적으로 로드됩니다. 프로덕션 빌드에서는 숨김 페이지를 반환하므로 이 저장소를 프로덕션 관리자 SPA로 간주하면 안 됩니다.

## Analytics

- `src/services/analytics.js`는 같은 출처의 `POST /api/events`로 자체 제품 이벤트를 보냅니다.
- `SEARCH`, `TIMETABLE_ADD`, `WISHLIST_ADD`, `COMBINATION_GENERATE` 등은 사용자 동작이 시작된 시점의 attempt 이벤트입니다. 인증, 충돌 검사, API 저장보다 먼저 기록될 수 있으므로 성공 건수로 해석하지 않습니다.
- `@vercel/speed-insights`의 `SpeedInsights`가 앱 루트에 마운트됩니다.

## Tech Stack

| Area | Stack |
|---|---|
| Frontend | React 18, Vite, JavaScript |
| Styling | Tailwind CSS, Lucide React |
| State | React Context, hooks |
| API | Fetch API, same-origin service layer |
| Export | html2canvas, PNG |
| QA | Node test runner, Playwright |
| Observability | First-party event endpoint, Vercel Speed Insights |
| Deployment | Vercel config, optional Sites worker build |

## Project Map

~~~text
src/
├── App.jsx                     # Main UI and user-flow orchestration
├── main.jsx                    # Semester bootstrap and React mount
├── components/                 # Search, timetable, modal, and dev admin UI
├── contexts/AuthContext.jsx    # Server-session restoration and user mirror
├── hooks/                      # Modal, focus, and scroll behavior
├── services/api.js             # Public and student API
├── services/adminApi.js        # Admin API only
├── services/analytics.js       # First-party attempt events
└── utils/                      # Timetable formatting and KST date handling
tests/
├── unit/                       # Node unit tests
└── e2e/                        # Desktop Chrome and Pixel 5 Playwright flows
~~~

## Local Development

~~~bash
npm ci
npm run dev
~~~

Vite proxies `/api/*` and `/admin/api/*` to `http://localhost:8080` by default. Override the backend when needed:

~~~bash
VITE_DEV_BACKEND_ORIGIN=http://localhost:8080 npm run dev
~~~

`VITE_BACKEND_ORIGIN` is also supported by the dev and preview proxies. `VITE_API_BASE_URL` and `VITE_ADMIN_API_BASE_URL` override the browser-side base paths, but same-origin paths are the normal setup.

## Deployment

`vercel.mjs` rewrites both API prefixes to one backend origin. Set `BACKEND_ORIGIN`
to the deployed backend service URL. The service URL verified on 2026-08-01 is:

~~~text
BACKEND_ORIGIN=https://inu-timetable-backend-vy3v2ludma-du.a.run.app
~~~

Do not include a trailing slash. The actual Vercel environment value is not stored
in this repository, so re-check it before changing domains. `npm run build:sites`
creates the Sites worker bundle, which uses the same `BACKEND_ORIGIN` contract.

## Scripts and Tests

| Command | Target |
|---|---|
| `npm run dev` | Vite development server |
| `npm run build` | Production bundle |
| `npm run build:sites` | Production bundle plus Sites worker layout |
| `npm run preview` | Preview the built bundle |
| `npm run lint` | ESLint over JavaScript and JSX |
| `npm run test:unit` | Node tests in `tests/unit/*.test.js` |
| `npm run test:e2e` | Local build/preview at `127.0.0.1:4173`, tested in desktop Chromium and Pixel 5 profiles |
| `npm run test:e2e:production` | Playwright against `https://inuu-timetable.vercel.app` |

The default local E2E preview proxies to the current Cloud Run backend. Set `E2E_BACKEND_ORIGIN` to test another backend, or `E2E_BASE_URL` to test an already running frontend. Authenticated E2E flows that need `POST /api/dev/session` skip when the selected backend does not expose that dev-only endpoint.

## Related Repository

- Backend: https://github.com/coldmans/inu_timetable
