import { expect, test } from '@playwright/test';

// 모바일 첫 화면은 시간표만 보이고, 검색 버튼을 눌러야 검색/목록이 열린다.
const openMobileCourseSearch = async (page, isMobile) => {
  if (!isMobile) return;

  await page.getByRole('button', { name: '과목 검색 열기' }).click();
  await expect(page.getByLabel('모바일 필터')).toBeVisible();
};

test('renders the public course search workspace', async ({ page, isMobile }) => {
  // 워커별 첫 테스트는 CI에서 백엔드(Cloud Run) 콜드스타트를 겪을 수 있어 타임아웃을 넉넉히 잡는다.
  test.slow();

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  if (isMobile) {
    // 모바일은 검색 인풋 대신 검색어 칩(시트 진입)을 쓰고, 검색 중에는 헤더가 숨겨진다.
    await expect(page.getByLabel('모바일 필터').getByRole('button', { name: /검색어/ })).toBeVisible();
  } else {
    await expect(page.getByRole('link', { name: 'INU 시간표' })).toBeVisible();
    await expect(page.getByPlaceholder('과목명을 검색해 보세요')).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
  await expect(page.getByTestId('course-row-summary').first()).toBeVisible({ timeout: 45_000 });
});

test('shows each schedule room segment in course results', async ({ page, isMobile }) => {
  const courseName = '강의실 표시 테스트';
  const course = {
    id: 99991,
    subjectName: courseName,
    courseCode: '0005069001',
    credits: 3,
    professor: '테스트교수',
    department: '건축공학전공',
    subjectType: '전심',
    grade: 4,
    semester: '2026-2',
    classMethod: 'OFFLINE',
    schedules: [{
      dayOfWeek: '목',
      startTime: '09:00',
      endTime: '15:00',
      roomSegments: [
        { id: 1, room: '28-508', startTime: '09:00', endTime: '12:00' },
        { id: 2, room: '09-501', startTime: '12:00', endTime: '13:30' },
        { id: 3, room: '27-104', startTime: '13:30', endTime: '15:00' },
      ],
    }],
  };

  await page.route('**/api/settings/current-semester', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ semester: '2026-2' }),
  }));
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: '인증이 필요합니다.' }),
  }));
  await page.route('**/api/subjects/filter?*', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      content: [course],
      totalElements: 1,
      totalPages: 1,
      number: 0,
    }),
  }));
  await page.route('**/api/subjects/departments?*', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  const courseSummary = page.getByTestId('course-row-summary').filter({ hasText: courseName });
  await expect(courseSummary).toBeVisible();
  await expect(courseSummary.getByTestId('course-time-chip')).toHaveText('목 1~7교시');
  await expect(courseSummary.getByTestId('course-room-chip')).toHaveText('28-508 / 09-501 / 27-104');
  await expect(courseSummary).not.toContainText('목 1~7교시 · 28-508');
  await expect(courseSummary).not.toContainText('목 1~4교시');

  if (isMobile) {
    await courseSummary.click();
    const expandedActions = page.getByTestId('course-row-actions');
    await expect(expandedActions).toBeVisible();
    await expect(expandedActions).not.toContainText('28-508 / 09-501 / 27-104');
  }
});

test('loads semester departments without losing college mappings', async ({ page, isMobile }) => {
  test.skip(isMobile, '데스크톱 학과 필터 매핑 검증');
  let requestedSemester = null;

  await page.route('**/api/subjects/departments?*', async route => {
    requestedSemester = new URL(route.request().url()).searchParams.get('semester');
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        '경제학과(야)',
        'Global Trade & Service학부',
        '소비자학과',
        '반도체융합전공',
        'IBE전공',
        '지능형로봇시스템연계전공',
        '신규연계전공',
        '교양',
      ]),
    });
  });

  await page.goto('/');
  await page.getByTestId('department-filter-trigger').click();
  const dialog = page.getByTestId('department-filter-modal');

  await dialog.getByRole('button', { name: '글로벌정경대학', exact: true }).click();
  await expect(dialog.getByTestId('department-option').filter({ hasText: '경제학과(야)' })).toBeVisible();
  await expect(dialog.getByTestId('department-option').filter({ hasText: 'Global Trade & Service학부' })).toBeVisible();
  await expect(dialog.getByTestId('department-option').filter({ hasText: '소비자학과' })).toBeVisible();

  await dialog.getByRole('button', { name: '공과대학', exact: true }).click();
  await expect(dialog.getByTestId('department-option').filter({ hasText: '반도체융합전공' })).toBeVisible();

  await dialog.getByRole('button', { name: '동북아국제통상물류학부', exact: true }).click();
  await expect(dialog.getByTestId('department-option').filter({ hasText: 'IBE전공' })).toBeVisible();

  await dialog.getByRole('button', { name: '단과대구분없음', exact: true }).click();
  await expect(dialog.getByTestId('department-option').filter({ hasText: '지능형로봇시스템연계전공' })).toBeVisible();

  await dialog.getByRole('button', { name: '기타', exact: true }).click();
  await expect(dialog.getByTestId('department-option').filter({ hasText: '신규연계전공' })).toBeVisible();
  await expect(dialog.getByTestId('department-option').filter({ hasText: '교양' })).toHaveCount(0);
  expect(requestedSemester).toBe('2026-2');
});

test('opens signup and exposes college to department selectors', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /로그인/ }).first().click();
  await page.getByRole('button', { name: '회원가입' }).click();

  await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
  await expect(page.getByRole('button', { name: '전공', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '복수전공', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '부전공', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '전공 단과대 선택' }).click();
  await page.getByRole('option', { name: '경영대학' }).click();
  await page.getByRole('button', { name: '전공 학과 선택' }).click();
  await expect(page.getByRole('option', { name: '데이터과학과' })).toBeVisible();
});

test('asks anonymous users to log in before saving a course', async ({ page, isMobile }) => {
  // 워커별 첫 테스트가 될 수 있어 백엔드 콜드스타트 여유를 둔다.
  test.slow();

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);
  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
  await expect(page.getByTestId('course-row-summary').first()).toBeVisible({ timeout: 45_000 });

  if (isMobile) {
    await page.getByTestId('course-row-summary').first().click();
    await page.getByTestId('course-row-actions').first().getByRole('button', { name: /담기/ }).click();
  } else {
    await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
    await page.getByRole('button', { name: /담기/ }).first().click();
  }

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByText('INU 시간표 계정으로 계속하세요.')).toBeVisible();
});

test('keeps an added course when a removal resync finishes late', async ({ page, isMobile }) => {
  test.skip(isMobile, '데스크톱 시간표 상태 경합 회귀 검증');

  const courseName = '영화속바이러스의이해';
  const course = {
    id: 12346,
    subjectName: courseName,
    courseCode: '0005069001',
    credits: 3,
    professor: '예정용',
    department: '교양',
    subjectType: '핵교',
    grade: 0,
    semester: '2026-2',
    schedules: [{ dayOfWeek: '화', startTime: '09:00', endTime: '12:00' }],
  };
  const existingCourse = {
    id: 12000,
    subjectName: '기존 테스트 과목',
    courseCode: 'TEST0001',
    credits: 3,
    professor: '테스트교수',
    department: '교양',
    subjectType: '핵교',
    grade: 0,
    semester: '2026-2',
    schedules: [{ dayOfWeek: '목', startTime: '09:00', endTime: '12:00' }],
  };

  let releaseRemovalResync;
  const removalResyncGate = new Promise(resolve => {
    releaseRemovalResync = resolve;
  });
  let timetableLoadCount = 0;
  let removalResyncStarted = false;

  await page.route('**/api/settings/current-semester', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ semester: '2026-2' }),
  }));
  await page.route('**/api/auth/me', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 681,
      username: 'race-test-user',
      grade: 4,
      major: '컴퓨터공학부',
      majors: [],
    }),
  }));
  await page.route('**/api/subjects/filter?*', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      content: [course],
      totalElements: 1,
      totalPages: 1,
      number: 0,
    }),
  }));
  await page.route('**/api/subjects/departments?*', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route('**/api/wishlist/user/**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route('**/api/timetable/user/**', async route => {
    timetableLoadCount += 1;
    if (timetableLoadCount === 1) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, subject: existingCourse }]),
      });
      return;
    }

    removalResyncStarted = true;
    await removalResyncGate;
    await route.fulfill({
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.route('**/api/auth/csrf', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ token: 'test-csrf-token' }),
  }));
  await page.route('**/api/timetable/remove?*', route => route.fulfill({
    contentType: 'application/json',
    body: '{}',
  }));
  await page.route('**/api/timetable/add', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: 1 }),
    });
    releaseRemovalResync();
  });
  await page.route('**/api/notifications/unread', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));

  await page.goto('/');

  await page.getByRole('button', { name: /기존 테스트 과목.*옵션 열기/ }).click();
  await page.getByRole('menuitem', { name: '시간표에서 제거', exact: true }).click();
  // 과거 구현의 1초 지연 재조회가 시작될 시간까지 기다린 뒤 새 과목을 추가한다.
  await page.waitForTimeout(1_200);

  const courseSummary = page.getByTestId('course-row-summary').filter({ hasText: courseName });
  await expect(courseSummary).toBeVisible();
  await courseSummary.locator('..').getByRole('button', { name: '추가', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('시간표에 추가했어요');
  await expect(page.getByRole('button', { name: new RegExp(`${courseName}.*옵션 열기`) })).toBeVisible();
  expect(removalResyncStarted).toBe(false);
});

test('searches courses by name', async ({ page, isMobile }) => {
  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  if (isMobile) {
    // 모바일은 검색어 칩 → 검색 시트에서 입력한다.
    await page.getByLabel('모바일 필터').getByRole('button', { name: /검색어/ }).click();
    const sheet = page.getByRole('dialog', { name: '과목 검색어 입력' });
    await expect(sheet).toBeVisible();
    const sheetInput = sheet.getByRole('textbox', { name: '검색어' });
    await sheetInput.fill('컴퓨터네트워크');
    await sheetInput.press('Enter');
    await expect(sheet).toBeHidden();
  } else {
    const searchInput = page.getByRole('textbox', { name: '과목명 검색' });
    await searchInput.fill('컴퓨터네트워크');
    await searchInput.press('Enter');
  }

  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
  await expect(page.getByTestId('course-row-summary').filter({ hasText: '컴퓨터네트워크' }).first()).toBeVisible();
});

test('moves to the next desktop result page', async ({ page, isMobile }) => {
  test.skip(isMobile, '데스크톱 페이지네이션 검증');

  await page.goto('/');
  const pagination = page.getByRole('navigation', { name: '검색 결과 페이지 이동' });
  await pagination.getByRole('button', { name: '다음 페이지' }).click();

  await expect(pagination).toContainText('21-40');
});

test('closes the login dialog with Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /로그인/ }).first().click();
  await expect(page.getByRole('dialog', { name: '로그인' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '로그인' })).toBeHidden();
});

test('opens compact mobile filter sheet', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 필터 시트 검증');

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);
  await page.getByLabel('모바일 필터').getByRole('button', { name: /상세/ }).click();

  await expect(page.getByRole('heading', { name: '상세 필터' })).toBeVisible();
  await expect(page.getByRole('button', { name: '상세 필터 닫기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '적용하고 닫기' })).toBeVisible();
});

test('shows a fitted mobile timetable preview and filter rail', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 상단 시간표와 필터 레일 검증');

  await page.goto('/');

  await expect(page.getByLabel('모바일 시간표')).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 시간표', exact: true })).toBeVisible();
  await expect(page.locator('.mini-timetable').first()).toBeVisible();

  await openMobileCourseSearch(page, isMobile);
  const filterRail = page.getByLabel('모바일 필터');
  await expect(filterRail).toBeVisible();
  await expect(filterRail.getByRole('button', { name: /학과/ })).toBeVisible();
  await expect(filterRail.getByRole('button', { name: /검색어/ })).toBeVisible();

  const pageHasHorizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth > window.innerWidth + 1
  ));
  expect(pageHasHorizontalOverflow).toBe(false);
});

test('expands mobile course details before showing actions', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 과목 상세 확장 검증');
  // 워커별 첫 테스트가 될 수 있어 백엔드 콜드스타트 여유를 둔다.
  test.slow();

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  const firstCourse = page.getByTestId('course-row-summary').first();
  await expect(firstCourse).toBeVisible({ timeout: 45_000 });
  await firstCourse.click();

  const actions = page.getByTestId('course-row-actions').first();
  await expect(actions).toBeVisible();
  await expect(actions.getByRole('button', { name: /시간표에 추가/ })).toBeVisible();
  await expect(actions.getByRole('button', { name: /담기/ })).toBeVisible();
  await expect(actions.getByRole('link', { name: /강의평/ })).toBeVisible();
});

// 회귀 테스트: 필터 시트가 열린 채 가로 회전하면 시트가 자동으로 닫히고
// 스크롤 락·inert 가 해제되어야 한다(앱 전체 먹통 방지).
test('closes mobile filter sheet on rotate to landscape without softlock', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 회전 시나리오 검증');

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);
  await page.getByLabel('모바일 필터').getByRole('button', { name: /구분/ }).click();

  const sheet = page.getByRole('dialog', { name: '이수구분 필터' });
  await expect(sheet).toBeVisible();

  await page.setViewportSize({ width: 851, height: 393 });

  await expect(sheet).toBeHidden();
  const bodyLock = await page.evaluate(() => ({
    position: getComputedStyle(document.body).position,
    headerInert: document.querySelector('header')?.inert ?? false,
  }));
  expect(bodyLock.position).toBe('static');
  expect(bodyLock.headerInert).toBe(false);
});

// 회귀 테스트: 시간(교시) 필터는 좁은 시트 안에서 드롭다운 대신
// 그리드 버튼으로 바로 선택할 수 있어야 한다.
test('selects hour blocks from the fullscreen time grid', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 시간 필터 검증');

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);
  await page.getByLabel('모바일 필터').getByRole('button', { name: /시간/ }).click();

  const sheet = page.getByRole('dialog', { name: '시간 필터' });
  await expect(sheet).toBeVisible();

  // 에타식 그리드: 24시 기준 셀 자유 토글 (수 12~13시 선택 후 12시 재탭 해제 → 13시만)
  await sheet.getByRole('button', { name: '수 12시' }).click();
  await sheet.getByRole('button', { name: '수 13시' }).click();
  await sheet.getByRole('button', { name: '월 9시' }).click();
  await sheet.getByRole('button', { name: '수 12시' }).click(); // 재탭 → 해당 셀만 해제
  await expect(sheet.getByRole('button', { name: '수 13시' })).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: '적용하고 닫기' }).click();

  await expect(sheet).toBeHidden();
  // 레일의 시간 칩에 요일별 시간 구간이 반영된다
  await expect(page.getByLabel('모바일 필터').getByRole('button', { name: /월 9~10/ })).toBeVisible();
});
