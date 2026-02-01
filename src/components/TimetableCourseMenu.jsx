import React, { useEffect, useRef } from 'react';
import { Trash2, Info, Heart, X, MessageSquare } from 'lucide-react';

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
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[180px]"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.min(position.y, window.innerHeight - 200),
      }}
    >
      {/* 헤더 */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm truncate flex-1">
            {course.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-500">{course.professor}</p>
      </div>

      {/* 메뉴 옵션 */}
      <div className="py-1">
        <button
          onClick={() => handleMenuClick(onViewDetails)}
          className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <Info size={16} className="text-blue-500" />
          <span className="text-sm text-gray-700">상세 정보 보기</span>
        </button>

        <a
          href={everytimeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-green-50 transition-colors"
        >
          <MessageSquare size={16} className="text-green-500" />
          <span className="text-sm text-gray-700">강의평 보기</span>
        </a>

        <button
          onClick={() => handleMenuClick(() => onAddToWishlist(course))}
          className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <Heart size={16} className="text-pink-500" />
          <span className="text-sm text-gray-700">위시리스트에 담기</span>
        </button>

        <div className="border-t border-gray-100 my-1"></div>

        <button
          onClick={() => handleMenuClick(() => onRemove(course))}
          className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
        >
          <Trash2 size={16} className="text-red-500" />
          <span className="text-sm">시간표에서 제거</span>
        </button>
      </div>
    </div>
  );
};

export default TimetableCourseMenu;