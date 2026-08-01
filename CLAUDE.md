# Repository Guidance

## Scope

This repository is the React 18/Vite frontend for INU Timetable. It is a JavaScript SPA styled with Tailwind CSS and backed by the Spring Boot API in `coldmans/inu_timetable`.

Keep documentation and implementation aligned with the current code. In particular, do not describe the combination service as AI, authentication as stateless/localStorage-only, search as debounced, export as PDF, analytics as GA4, or the admin page as a production SPA.

## Commands

~~~bash
npm ci
npm run dev
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run test:e2e:production
npm run build:sites
npm run preview
~~~

- `npm run dev` proxies `/api` and `/admin/api` to `http://localhost:8080`. Set `VITE_DEV_BACKEND_ORIGIN` (preferred for dev) or `VITE_BACKEND_ORIGIN` to override it.
- `npm run test:unit` runs Node tests matching `tests/unit/*.test.js`.
- `npm run test:e2e` builds and previews locally at `http://127.0.0.1:4173`, then runs desktop Chromium and Pixel 5 projects. The preview proxy uses `E2E_BACKEND_ORIGIN` or the current Cloud Run backend.
- `npm run test:e2e:production` sets `E2E_BASE_URL` to the live Vercel site. When any `E2E_BASE_URL` is set, Playwright does not start the local web server.
- Authenticated E2E cases that depend on `POST /api/dev/session` intentionally skip against backends without the dev endpoint.

For ordinary code changes, run lint, unit tests, and build. Run the relevant Playwright projects when behavior or responsive UI changes.

## Source Map

~~~text
src/
├── App.jsx
├── main.jsx
├── components/
├── contexts/AuthContext.jsx
├── hooks/
├── services/
│   ├── api.js
│   ├── adminApi.js
│   └── analytics.js
└── utils/
    ├── dateTime.js
    └── timetableUtils.js
tests/
├── unit/
└── e2e/
~~~

- `src/main.jsx` fetches the server's current semester before mounting React and mounts Vercel Speed Insights.
- `src/App.jsx` owns the main course, wishlist, timetable, combination, responsive, export, and modal flows.
- `src/components/` contains reusable course rows, timetable views, mobile sheets, account/auth/inquiry UI, and the dev-only subject manager.
- `src/contexts/AuthContext.jsx` restores the server session and mirrors the last server-confirmed user profile to localStorage.
- `src/services/api.js` owns public and student APIs; `src/services/adminApi.js` owns `/admin/api` calls.
- `src/services/analytics.js` sends first-party attempt events to `POST /api/events`.
- `src/utils/timetableUtils.js` owns the current-semester fallback, schedule/room formatting, conflict logic, colors, and filter constants.
- `src/utils/dateTime.js` renders server timestamps in `Asia/Seoul`.

## Runtime Contracts

### Semester

- `CURRENT_SEMESTER` defaults to `2026-2`.
- Before the app renders, `GET /api/settings/current-semester` may replace that value. A 2.5-second timeout or request failure keeps the fallback.
- Keep all semester-scoped subject, department, wishlist, timetable, and combination calls on the same resolved value.

### Authentication and CSRF

- Authentication is a cookie-backed server session, not a client-only token.
- `AuthContext` restores with `GET /api/auth/me` using `credentials: include`. `localStorage.user` is a write-only profile mirror in current code and must not be trusted as proof of authentication.
- Use `fetchWithUserSession` for session-aware reads.
- Use `fetchWithUserCsrf` for authenticated user/admin state changes. It obtains `XSRF-TOKEN` from `GET /api/auth/csrf`, sends `X-XSRF-TOKEN`, and retries once after a 403 with a refreshed token. Login, registration, and public inquiry have separate request contracts; verify the existing API group before adding a call.
- Keep public/student endpoints in `api.js` and admin endpoints in `adminApi.js`.

### Search and Responsive Results

- Search text is submitted explicitly: Enter or the desktop search button, and Enter/recent-search selection in the mobile sheet. There is no search debounce.
- Filter changes automatically reload page zero.
- The backend supplies 20-item pages. Desktop shows page navigation; mobile accumulates pages with an `IntersectionObserver` sentinel.
- Mobile starts with the timetable and opens search/filter sheets. Preserve the separate mobile and desktop interaction paths when changing shared state.

### Timetable Data and Export

- Preserve schedule-level `roomSegments`. A course can have several room segments and several distinct room labels.
- Reuse `formatCourseSchedule`, `getCourseRoomNames`, and related utilities instead of rebuilding room/time strings in components.
- The timetable export path dynamically imports `html2canvas` and downloads PNG only. There is no jsPDF dependency.
- Combination generation is a backend request using wishlist requirements and free days. `targetCredits` is optional; `null` sends `ignoreTargetCredits: true` and omits an exact target.

### Updates, Inquiries, and Analytics

- Update logs come from `/api/subjects/update-logs`. Unzoned backend values are treated as UTC and displayed in Korean time through `formatUtcDateTimeInKorea`.
- Inquiries are submitted through `/api/inquiries` by anonymous or authenticated users. Public FAQ items come from `/api/inquiries/faqs` and the FAQ section stays hidden when empty.
- Analytics events from `analytics.js` are attempt events. For example, add/generate events can fire before auth, validation, conflict checks, or persistence. Do not report them as successful saved actions.
- Speed Insights is mounted independently of the first-party event endpoint.

### Admin and Deployment Boundaries

- `/admin/subjects` and `AdminSubjectManager` are development-only. `App.jsx` guards the lazy import with `import.meta.env.DEV` and returns `HiddenPage` in production.
- This is an exact pathname branch inside `AppContent`, not a separate router entry or production admin application.
- Do not add the admin bundle to production or describe a production admin SPA without an explicit product/security decision.
- `vercel.mjs` rewrites both API prefixes through one `BACKEND_ORIGIN`. The Sites worker created by `npm run build:sites` uses the same variable.
- Development-only mock fallbacks must remain guarded by `import.meta.env.DEV`; production API failures should surface as errors.

## Change Guidelines

- Use functional components and hooks; put reusable UI in `src/components` and shared behavior in `hooks` or `utils`.
- Keep Korean user-facing copy concise and test accessible names/roles when changing interactions.
- Keep API parsing and cookie/CSRF behavior in the service layer rather than duplicating fetch logic in components.
- Preserve desktop and mobile behavior independently: verify both after search, filter, modal, timetable, or combination changes.
- Extend focused unit tests for pure utilities and Playwright tests for user-visible flows.
- Do not claim a feature, endpoint, metric, deployment, or admin surface from a helper name alone; verify the active call site and target environment.
