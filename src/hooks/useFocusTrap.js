import { useEffect } from 'react';

// 모달/바텀시트 접근성 훅: 열릴 때 패널로 초점 이동(검색 input 자동 포커스로 키보드가 즉시 뜨는 것 방지),
// Tab 순환 트랩, 닫힐 때 직전 초점(트리거)으로 복귀. 패널 요소에는 ref 와 tabIndex={-1} 을 부여해야 한다.
export default function useFocusTrap(active, panelRef) {
  useEffect(() => {
    if (!active) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;
    const previouslyFocused = document.activeElement;
    panel.focus();
    const getFocusables = () => Array.from(
      panel.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const items = getFocusables();
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey && (activeEl === first || activeEl === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', handleKeyDown);
    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active, panelRef]);
}
