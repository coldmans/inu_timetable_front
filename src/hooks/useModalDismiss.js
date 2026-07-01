import { useEffect } from 'react';

// Escape 키로 오버레이를 닫는다(모달 전반 일관화).
// 바깥(backdrop) 클릭 닫기는 각 오버레이의 backdrop 요소에서
// onClick={(e) => e.target === e.currentTarget && onClose()} 로 처리한다.
export default function useModalDismiss(active, onClose) {
  useEffect(() => {
    if (!active || typeof onClose !== 'function') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, onClose]);
}
