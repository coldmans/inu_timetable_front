import { trackGoogleAnalyticsEvent } from './googleAnalytics';

// 자체 제품 분석용 이벤트 트래킹.
// 비로그인 사용자 구분을 위해 클라이언트 세션 ID(localStorage)를 함께 보낸다.
// 수집 실패가 사용자 흐름을 방해하지 않도록 모든 오류는 조용히 무시한다.

const SESSION_KEY = 'inu_session_id';

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function trackEvent(eventType, label = null) {
  try {
    // Google에는 자유 입력 검색어·과목명 label을 보내지 않는다.
    trackGoogleAnalyticsEvent(eventType);

    const body = JSON.stringify({
      eventType,
      label: label ? String(label).slice(0, 255) : null,
      sessionId: getSessionId(),
    });
    // keepalive: 페이지 이탈 중에도 전송 보장
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    /* no-op: 분석은 부가 기능이라 실패해도 무시 */
  }
}
