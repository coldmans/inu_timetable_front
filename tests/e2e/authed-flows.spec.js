import { expect, test } from '@playwright/test';

// 로그인 후 핵심 플로우 검증.
// 백엔드의 dev 세션(POST /api/dev/session, dev/local 프로필 전용)으로 인증한다.
// 운영 백엔드(CI candidate-smoke 포함)에는 이 엔드포인트가 없으므로 자동 스킵되고,
// 로컬 백엔드(dev 프로필)를 띄운 환경에서 실제로 실행된다.

const openMobileCourseSearch = async (page, isMobile) => {
  if (!isMobile) return;

  await page.getByRole('button', { name: '과목 검색 열기' }).click();
  await expect(page.getByLabel('모바일 필터')).toBeVisible();
};

test('dev 세션으로 로그인해 시간표 추가부터 조합 적용까지 수행한다', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 UI 기준 플로우 검증(데스크톱 조합 트리거는 별도)');
  test.slow();

  const session = await page.request.post('/api/dev/session', {
    data: { seedWishlist: true, reset: true },
  });
  test.skip(!session.ok(), 'dev 세션 미지원 환경(운영 백엔드) — 로컬 백엔드에서 실행됨');

  await page.goto('/');

  // 로그인 상태: 헤더에 계정 버튼이 보인다
  await expect(page.getByRole('button', { name: /계정/ })).toBeVisible();

  // 1) 과목 검색 → 시간표에 추가
  await openMobileCourseSearch(page, isMobile);
  await expect(page.getByTestId('course-row-summary').first()).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('course-row-summary').first().click();
  await page.getByTestId('course-row-actions').first()
    .getByRole('button', { name: /시간표에 추가/ }).click();
  await expect(page.getByRole('status')).toContainText(/시간표/, { timeout: 15_000 });

  // 2) 시드된 위시리스트 확인 (담은 N > 0)
  const wishlistChip = page.getByRole('button', { name: /담은 과목 \d+개/ });
  await expect(wishlistChip).toBeVisible();
  const chipLabel = await wishlistChip.getAttribute('aria-label');
  expect(chipLabel).not.toBe('담은 과목 0개');

  // 3) 조합 생성 → 결과 확인 → 적용
  await page.getByRole('button', { name: '조합', exact: true }).click();
  await page.getByRole('button', { name: /조합 만들기 시작/ }).click();

  const resultsDialog = page.getByRole('dialog', { name: /시간표/ });
  const applyButton = page.getByRole('button', { name: '이 조합 선택' });
  await expect(applyButton).toBeVisible({ timeout: 60_000 });
  await applyButton.click();

  await expect(page.getByRole('status')).toContainText(/적용/, { timeout: 30_000 });
  await expect(resultsDialog).toBeHidden();
});
