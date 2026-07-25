import { expect, test } from '@playwright/test';

// 모바일 첫 화면은 시간표만 보이고, 검색 버튼을 눌러야 검색/목록이 열린다.
const openMobileCourseSearch = async (page, isMobile) => {
  if (!isMobile) return;

  await page.getByRole('button', { name: '과목 검색 열기' }).click();
  await expect(page.getByRole('region', { name: '과목 검색', exact: true })).toBeVisible();
};

test('renders the public course search workspace', async ({ page, isMobile }) => {
  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  await expect(page.getByRole('link', { name: 'INU 시간표' })).toBeVisible();
  await expect(page.getByPlaceholder('과목명을 검색해 보세요')).toBeVisible();
  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
  await expect(page.getByTestId('course-row-summary').first()).toBeVisible();
});

test('opens signup and exposes college to department selectors', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /로그인/ }).first().click();
  await page.getByRole('button', { name: '회원가입' }).click();

  await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
  await expect(page.getByText('선택한 전공')).toBeVisible();
  await expect(page.getByRole('button', { name: '전공', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '복수전공', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '부전공', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '전공 단과대 선택' }).click();
  await page.getByRole('option', { name: '경영대학' }).click();
  await page.getByRole('button', { name: '전공 학과 선택' }).click();
  await expect(page.getByRole('option', { name: '데이터과학과' })).toBeVisible();
});

test('asks anonymous users to log in before saving a course', async ({ page, isMobile }) => {
  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);
  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();

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

test('searches courses by name', async ({ page, isMobile }) => {
  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  const searchInput = page.getByRole('textbox', { name: '과목명 검색' });
  await searchInput.fill('데이터베이스');
  await searchInput.press('Enter');

  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
  await expect(page.getByTestId('course-row-summary').filter({ hasText: '데이터베이스' }).first()).toBeVisible();
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

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);

  const firstCourse = page.getByTestId('course-row-summary').first();
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
test('selects periods from grid buttons in the time filter sheet', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 시간 필터 검증');

  await page.goto('/');
  await openMobileCourseSearch(page, isMobile);
  await page.getByLabel('모바일 필터').getByRole('button', { name: /시간/ }).click();

  const sheet = page.getByRole('dialog', { name: '시간 필터' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('시작 교시')).toBeVisible();

  await sheet.getByRole('button', { name: '1교시', exact: true }).first().click();
  await sheet.getByRole('button', { name: '적용하고 닫기' }).click();

  await expect(sheet).toBeHidden();
  // 레일의 시간 칩에 선택한 교시가 반영된다("시간 1교시 - 종료" 형태)
  await expect(page.getByLabel('모바일 필터').getByRole('button', { name: /1교시/ })).toBeVisible();
});
