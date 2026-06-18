import { expect, test } from '@playwright/test';

test('renders the public course search workspace', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'INU 시간표' })).toBeVisible();
  await expect(page.getByPlaceholder('과목명을 검색해 보세요')).toBeVisible();
  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();
  await expect(page.getByText(/2,894|2894/).first()).toBeVisible();
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

test('asks anonymous users to log in before saving a course', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '검색 결과' })).toBeVisible();

  await page.getByRole('button', { name: /담기/ }).first().click();

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(page.getByText('INU 시간표 계정으로 계속하세요.')).toBeVisible();
});

test('opens compact mobile filter sheet', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 필터 시트 검증');

  await page.goto('/');
  await page.getByRole('button', { name: /상세/ }).click();

  await expect(page.getByRole('heading', { name: '상세 필터' })).toBeVisible();
  await expect(page.getByRole('button', { name: '상세 필터 닫기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '적용하고 닫기' })).toBeVisible();
});

test('shows a scrollable mobile timetable preview and filter rail', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 전용 상단 시간표와 필터 레일 검증');

  await page.goto('/');

  await expect(page.getByLabel('모바일 시간표 미리보기')).toBeVisible();
  await expect(page.getByRole('heading', { name: '내 시간표' })).toBeVisible();

  const filterRail = page.getByLabel('모바일 필터');
  await expect(filterRail).toBeVisible();
  await expect(filterRail.getByRole('button', { name: /학과/ })).toBeVisible();
  await expect(filterRail.getByRole('button', { name: /검색어/ })).toBeVisible();

  const hasHorizontalOverflow = await filterRail.evaluate(element => element.scrollWidth > element.clientWidth);
  expect(hasHorizontalOverflow).toBe(true);
});
