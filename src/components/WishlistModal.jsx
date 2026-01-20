import React from 'react';
import { X, Clock, Star, Trash2, Eye, Info, Plus } from 'lucide-react';

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
  onViewCourseDetails,
  targetCredits,
  setTargetCredits,
  freeDays,
  setFreeDays,
  onRunGenerator
}) => {
  if (!isOpen) return null;

  const totalCredits = wishlist.reduce((acc, c) => acc + c.credits, 0);
  const daysOfWeek = ['월', '화', '수', '목', '금'];

  const handleToggleFreeDay = (day) => {
    if (freeDays.includes(day)) {
      setFreeDays(freeDays.filter(d => d !== day));
    } else {
      setFreeDays([...freeDays, day]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">위시리스트</h2>
              <p className="mt-1 text-sm text-slate-500">총 {wishlist.length}개 과목 • {totalCredits}학점</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">목표 학점</span>
              <select
                value={targetCredits}
                onChange={(e) => setTargetCredits(parseInt(e.target.value))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <div className="mb-2">
                <span className="text-sm font-medium text-blue-900">희망 공강 (선택)</span>
                <span className="ml-2 text-xs text-blue-600">원하는 공강 요일을 선택하세요</span>
              </div>
              <div className="flex gap-2">
                {daysOfWeek.map(day => (
                  <button
                    key={day}
                    onClick={() => handleToggleFreeDay(day)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      freeDays.includes(day)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {wishlist.length > 0 && onRunGenerator && (
            <div className="mt-4">
              <button
                onClick={onRunGenerator}
                className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {totalCredits}학점 조합 만들기
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {wishlist.length > 0 ? (
            <div className="space-y-4">
              {wishlist.map(course => (
                <div
                  key={course.id}
                  className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                    course.isRequired ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{course.name}</h3>
                      {course.isRequired && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                          필수
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onViewCourseDetails(course)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Info size={16} /> 상세보기
                    </button>
                  </div>

                  <div className="mb-3 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-500" />
                      <span>{course.credits}학점</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{course.professor}</span>
                    </div>
                  </div>

                  <div className="mb-3 flex items-start gap-2 text-sm text-blue-600">
                    <Clock size={16} className="mt-0.5" />
                    <span className="font-medium">{formatTimeDisplay(course.schedules)}</span>
                  </div>

                  {course.location && (
                    <div className="mb-1 text-sm text-slate-600">
                      강의실: {course.location}
                    </div>
                  )}

                  {course.type && (
                    <div className="mb-3 text-sm text-slate-500">
                      이수구분: {course.type}
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`required-modal-${course.id}`}
                      checked={course.isRequired || false}
                      onChange={() => onToggleRequired(course.id, course.isRequired)}
                      className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <label
                      htmlFor={`required-modal-${course.id}`}
                      className="cursor-pointer text-sm text-slate-600"
                    >
                      필수 포함 과목
                    </label>
                  </div>

                  <div className="flex gap-2 border-t border-slate-200 pt-3">
                    <button
                      onClick={() => onAddToTimetable(course)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
                    >
                      <Plus size={16} /> 시간표 추가
                    </button>
                    <button
                      onClick={() => onRemoveFromWishlist(course.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 size={16} /> 제거
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <h3 className="text-lg font-medium text-slate-600">위시리스트가 비어있어요</h3>
              <p className="mt-2 text-sm text-slate-400">관심 있는 과목을 먼저 담아두고 조합을 만들어 보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistModal;
