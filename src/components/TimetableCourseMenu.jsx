import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Info, Heart, MessageSquare } from 'lucide-react';

const TimetableCourseMenu = ({
  isOpen,
  onClose,
  course,
  position,
  onRemove,
  onViewDetails,
  onAddToWishlist
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // pointerdown 은 마우스·터치·펜을 모두 커버한다(iOS 사파리는 mousedown 합성이 빠질 수 있음).
      document.addEventListener('pointerdown', handleOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handleOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const handleMenuClick = (action) => {
    action();
    onClose();
  };

  const everytimeUrl = `https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`;

  // backdrop-filter 조상이 있으면 fixed 의 기준이 뷰포트가 아니게 되어 위치가 어긋나므로
  // 포털로 body 에 직접 렌더링한다. z-index 는 헤더(40)·모달(50)·토스트(60)보다 위.
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="modal-panel fixed z-[75] min-w-[200px] rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-slate-200"
      style={{
        left: Math.max(8, Math.min(position.x, window.innerWidth - 216)),
        top: Math.max(8, Math.min(position.y, window.innerHeight - 240)),
      }}
    >
      <div className="border-b border-slate-100 px-3.5 pb-2 pt-1">
        <p className="truncate text-sm font-semibold text-slate-900">{course.name}</p>
        <p className="truncate text-xs text-slate-500">{course.professor}</p>
      </div>

      <div className="py-1">
        <button
          role="menuitem"
          onClick={() => handleMenuClick(onViewDetails)}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Info size={15} className="text-slate-400" />
          상세 정보 보기
        </button>

        <a
          role="menuitem"
          href={everytimeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
        >
          <MessageSquare size={15} className="text-emerald-500" />
          강의평 보기
        </a>

        <button
          role="menuitem"
          onClick={() => handleMenuClick(() => onAddToWishlist(course))}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Heart size={15} className="text-rose-400" />
          위시리스트에 담기
        </button>

        <div className="my-1 border-t border-slate-100"></div>

        <button
          role="menuitem"
          onClick={() => handleMenuClick(() => onRemove(course))}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <Trash2 size={15} />
          시간표에서 제거
        </button>
      </div>
    </div>,
    document.body
  );
};

export default TimetableCourseMenu;
