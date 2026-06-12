import React, { useEffect, useRef } from 'react';
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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const handleMenuClick = (action) => {
    action();
    onClose();
  };

  const everytimeUrl = `https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="modal-panel fixed z-50 min-w-[200px] rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-slate-200"
      style={{
        left: Math.min(position.x, window.innerWidth - 216),
        top: Math.min(position.y, window.innerHeight - 220),
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
    </div>
  );
};

export default TimetableCourseMenu;
