import React from 'react';
import { X, Clock, Star, Trash2, Eye } from 'lucide-react';

// 시간 정보를 한국어 표시용으로 포맷하는 함수
const formatTimeDisplay = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) return '시간 미정';
  
  const dayMapping = {
    'MONDAY': '월',
    'TUESDAY': '화', 
    'WEDNESDAY': '수',
    'THURSDAY': '목',
    'FRIDAY': '금',
    'SATURDAY': '토',
    'SUNDAY': '일'
  };
  
  return schedules.map(schedule => {
    const day = dayMapping[schedule.dayOfWeek] || schedule.dayOfWeek;
    let timeStr = '';
    
    if (typeof schedule.startTime === 'string' && schedule.startTime.includes(':')) {
      // HH:MM 형식
      timeStr = `${schedule.startTime}~${schedule.endTime}`;
    } else {
      // 교시 번호 형식
      timeStr = `${schedule.startTime}~${schedule.endTime}교시`;
    }
    
    return `${day} ${timeStr}`;
  }).join(', ');
};

const WishlistModal = ({ 
  isOpen, 
  onClose, 
  wishlist, 
  onRemoveFromWishlist, 
  onToggleRequired, 
  onAddToTimetable,
  targetCredits,
  setTargetCredits
}) => {
  if (!isOpen) return null;

  const totalCredits = wishlist.reduce((acc, c) => acc + c.credits, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                🛒 위시리스트 
                <span className="text-lg text-gray-500">({wishlist.length}개 과목)</span>
              </h2>
              <p className="text-gray-600 mt-1">총 {totalCredits}학점</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* 목표 학점 선택 */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mt-4">
            <span className="text-sm font-medium text-blue-800">🎯 목표 학점:</span>
            <select
              value={targetCredits}
              onChange={(e) => setTargetCredits(parseInt(e.target.value))}
              className="px-3 py-2 text-sm border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={12}>12학점</option>
              <option value={13}>13학점</option>
              <option value={14}>14학점</option>
              <option value={15}>15학점</option>
              <option value={16}>16학점</option>
              <option value={17}>17학점</option>
              <option value={18}>18학점 (권장)</option>
              <option value={19}>19학점</option>
              <option value={20}>20학점</option>
              <option value={21}>21학점</option>
              <option value={22}>22학점</option>
              <option value={23}>23학점</option>
              <option value={24}>24학점</option>
            </select>
          </div>
        </div>

        {/* 위시리스트 내용 */}
        <div className="p-6">
          {wishlist.length > 0 ? (
            <div className="grid gap-4">
              {wishlist.map(course => (
                <div 
                  key={course.id} 
                  className={`p-4 rounded-lg border-2 ${
                    course.isRequired 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-gray-50 border-gray-200'
                  } hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 과목명과 필수 태그 */}
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{course.name}</h3>
                        {course.isRequired && (
                          <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
                            필수
                          </span>
                        )}
                      </div>

                      {/* 기본 정보 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star size={16} className="text-yellow-500" />
                          <span>{course.credits}학점</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>👨‍🏫 {course.professor}</span>
                        </div>
                      </div>

                      {/* 시간 정보 */}
                      <div className="flex items-start gap-2 mb-3">
                        <Clock size={16} className="text-blue-500 mt-0.5" />
                        <div className="text-sm text-blue-600 font-medium">
                          {formatTimeDisplay(course.schedules)}
                        </div>
                      </div>

                      {/* 추가 정보 */}
                      {course.location && (
                        <div className="text-sm text-gray-600 mb-2">
                          📍 {course.location}
                        </div>
                      )}
                      
                      {course.type && (
                        <div className="text-sm text-gray-600 mb-3">
                          📚 {course.type}
                        </div>
                      )}

                      {/* 필수 과목 체크박스 */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`required-modal-${course.id}`}
                          checked={course.isRequired || false}
                          onChange={() => onToggleRequired(course.id, course.isRequired)}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                        />
                        <label 
                          htmlFor={`required-modal-${course.id}`}
                          className="text-sm text-gray-600 cursor-pointer"
                        >
                          필수 포함 과목
                        </label>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => onAddToTimetable(course)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <Eye size={16} />
                        시간표에 추가
                      </button>
                      <button 
                        onClick={() => onRemoveFromWishlist(course.id)} 
                        className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                        제거
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">위시리스트가 비어있어요</h3>
              <p className="text-gray-500">관심있는 과목을 위시리스트에 담아보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistModal;