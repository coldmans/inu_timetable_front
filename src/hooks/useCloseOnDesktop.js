import { useEffect } from 'react';

// 모바일 전용(md:hidden) 오버레이가 열린 채 화면이 데스크톱 폭으로 넘어가면(가로 회전 등)
// 시트만 display:none 이 되고 스크롤 락과 inert 는 남아 앱 전체가 잠기므로 자동으로 닫는다.
// matchMedia change 이벤트를 발생시키지 않는 환경(일부 웹뷰/헤드리스)을 위해 resize 도 함께 본다.
export default function useCloseOnDesktop(active, onClose) {
  useEffect(() => {
    if (!active) return undefined;

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const closeIfDesktop = () => {
      if (mediaQuery.matches) {
        onClose();
      }
    };

    if (mediaQuery.matches) {
      onClose();
      return undefined;
    }

    mediaQuery.addEventListener('change', closeIfDesktop);
    window.addEventListener('resize', closeIfDesktop);
    return () => {
      mediaQuery.removeEventListener('change', closeIfDesktop);
      window.removeEventListener('resize', closeIfDesktop);
    };
  }, [active, onClose]);
}
