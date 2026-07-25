import { useEffect } from 'react';

// 여러 오버레이(모달·바텀시트)가 중첩/재실행되어도 body 스크롤 락이 오염되지 않도록
// 전역 카운터로 관리한다. iOS Safari 는 body{overflow:hidden} 만으로는 배경 터치 스크롤이
// 새기 때문에 position:fixed 방식으로 잠그고, 마지막 오버레이가 닫힐 때 위치를 복원한다.
let lockCount = 0;
let savedScrollY = 0;
let prevStyles = null;

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;

    if (lockCount === 0) {
      const { body, documentElement } = document;
      savedScrollY = window.scrollY;
      prevStyles = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
        overscrollBehavior: documentElement.style.overscrollBehavior,
      };
      body.style.position = 'fixed';
      body.style.top = `-${savedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      documentElement.style.overscrollBehavior = 'none';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && prevStyles) {
        const { body, documentElement } = document;
        body.style.position = prevStyles.position;
        body.style.top = prevStyles.top;
        body.style.left = prevStyles.left;
        body.style.right = prevStyles.right;
        body.style.width = prevStyles.width;
        body.style.overflow = prevStyles.overflow;
        documentElement.style.overscrollBehavior = prevStyles.overscrollBehavior;
        prevStyles = null;
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
