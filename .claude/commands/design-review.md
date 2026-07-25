---
description: 현재 브랜치(또는 지정 대상)의 UI 변경에 대해 디자인 리뷰를 실행합니다 — 실브라우저에서 모바일 뷰포트 우선으로 검증
---

GIT STATUS:

```
!`git status`
```

FILES MODIFIED:

```
!`git diff --name-only origin/HEAD...`
```

DIFF CONTENT:

```
!`git diff --merge-base origin/HEAD`
```

OBJECTIVE:
design-review 에이전트를 사용해 위 diff(비어 있으면 $ARGUMENTS 로 지정된 화면/기능)를 종합 리뷰하고, 마크다운 리포트만 답하라. 모바일(375x812) 뷰포트를 기본으로 시작하고 에이전트 정의의 Mobile Web Addendum 체크리스트를 반드시 적용할 것.
