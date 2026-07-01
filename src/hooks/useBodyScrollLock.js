import { useEffect } from 'react';

// 여러 오버레이(모달·바텀시트)가 중첩/재실행되어도 body 스크롤 락이 오염되지 않도록
// 전역 카운터로 관리한다. 마지막 오버레이가 닫힐 때만 원래 overflow 로 복원하므로,
// "닫은 뒤 스크롤 영구 잠김"과 "배경 스크롤 누출"을 한 곳에서 일관되게 해결한다.
let lockCount = 0;
let prevOverflow = '';

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [active]);
}
