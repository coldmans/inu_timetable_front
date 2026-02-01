import React, { useState } from 'react';
import { X, Clock, Star, Trash2, Eye, Info, Plus, ChevronLeft, Calendar, Settings, MessageSquare } from 'lucide-react';

// 시간 정보를 한국어 표시용으로 포맷하는 함수 (기존 유지)
const formatTimeDisplay = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) return '시간 미정';

  const dayMapping = {
    'MONDAY': '월', 'TUESDAY': '화', 'WEDNESDAY': '수', 'THURSDAY': '목', 'FRIDAY': '금',
    'SATURDAY': '토', 'SUNDAY': '일'
  };

  return schedules.map(schedule => {
    const day = dayMapping[schedule.dayOfWeek] || schedule.dayOfWeek;
    let timeStr = '';

    if (typeof schedule.startTime === 'string' && schedule.startTime.includes(':')) {
      timeStr = `${schedule.startTime}~${schedule.endTime}`;
    } else {
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
  /* New Prop: initialStep */
  initialStep = 'list',
  onRunGenerator
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(initialStep); // Initialize with prop
  const totalCredits = wishlist.reduce((acc, c) => acc + c.credits, 0);
  const daysOfWeek = ['월', '화', '수', '목', '금'];

  // Sync step when isOpen or initialStep changes
  React.useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
    }
  }, [isOpen, initialStep]);

  const handleToggleFreeDay = (day) => {
    if (freeDays.includes(day)) {
      setFreeDays(freeDays.filter(d => d !== day));
    } else {
      setFreeDays([...freeDays, day]);
    }
  };

  // 모달 닫을 때 step 초기화
  const handleClose = () => {
    setStep('list');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 backdrop-blur-sm">
      {/* Mobile: Full screen from bottom / Desktop: Centered card */}
      <div className="flex w-full h-[100svh] sm:h-auto sm:max-h-[90vh] sm:max-w-lg md:max-w-2xl lg:max-w-4xl flex-col overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-slate-200 shadow-2xl">

        {/* === Header Shared Area === */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {step === 'setup' && (
                <button
                  onClick={() => setStep('list')}
                  className="mr-1 rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft size={22} className="text-slate-600" />
                </button>
              )}
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
                  {step === 'list' ? '위시리스트' : '조합 설정'}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 truncate">
                  {step === 'list'
                    ? `총 ${wishlist.length}개 과목 • ${totalCredits}학점`
                    : '학점과 공강 요일 선택'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* === Content Area === */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {step === 'list' ? (
            // --- List View ---
            wishlist.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {wishlist.map(course => (
                  <div
                    key={course.id}
                    className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 shadow-sm transition-colors ${course.isRequired ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'
                      }`}
                  >
                    {/* Course Header */}
                    <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{course.name}</h3>
                        {course.isRequired && (
                          <span className="flex-shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                            필수
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onViewCourseDetails(course)}
                        className="flex-shrink-0 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Info size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">상세보기</span>
                      </button>
                    </div>

                    {/* Course Info */}
                    <div className="mb-2 sm:mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="text-amber-500" />
                        <span>{course.credits}학점</span>
                      </div>
                      <span className="font-medium text-slate-700">{course.professor}</span>
                    </div>

                    <div className="mb-2 sm:mb-3 flex items-start gap-1.5 text-xs sm:text-sm text-blue-600">
                      <Clock size={14} className="mt-0.5 flex-shrink-0" />
                      <span className="font-medium">{formatTimeDisplay(course.schedules)}</span>
                    </div>

                    {/* Required Checkbox */}
                    <div className="mb-2 sm:mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-modal-${course.id}`}
                        checked={course.isRequired || false}
                        onChange={() => onToggleRequired(course.id, course.isRequired)}
                        className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <label
                        htmlFor={`required-modal-${course.id}`}
                        className="cursor-pointer text-xs sm:text-sm text-slate-600"
                      >
                        필수 포함 과목
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-2 sm:pt-3">
                      <a
                        href={`https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-100 px-3 py-2 text-xs sm:text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                      >
                        <MessageSquare size={14} /> 강의평
                      </a>
                      <button
                        onClick={() => onAddToTimetable(course)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
                      >
                        <Plus size={14} /> 시간표 추가
                      </button>
                      <button
                        onClick={() => onRemoveFromWishlist(course.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">제거</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 sm:py-12 text-center">
                <h3 className="text-base sm:text-lg font-medium text-slate-600">위시리스트가 비어있어요</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400">관심 있는 과목을 먼저 담아두세요.</p>
              </div>
            )
          ) : (
            // --- Setup View ---
            <div className="space-y-6 sm:space-y-8">
              {/* Target Credits */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900">
                  <Settings size={20} className="text-slate-500" />
                  <h3>목표 학점 설정</h3>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6">
                  {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(credit => (
                    <button
                      key={credit}
                      onClick={() => setTargetCredits(credit)}
                      className={`rounded-lg sm:rounded-xl border py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all ${targetCredits === credit
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                    >
                      {credit}
                      {credit === 18 && <span className="block text-[9px] sm:text-[10px] font-normal text-blue-500">(권장)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free Days */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900">
                  <Calendar size={20} className="text-slate-500" />
                  <h3>희망 공강 요일</h3>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      onClick={() => handleToggleFreeDay(day)}
                      className={`flex-1 rounded-lg sm:rounded-xl border py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all ${freeDays.includes(day)
                        ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500">
                  * 선택한 요일에는 수업이 배정되지 않습니다.
                </p>
              </div>

              {/* Info Box */}
              <div className="rounded-lg sm:rounded-xl bg-slate-50 p-3 sm:p-4 border border-slate-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Info size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                    <p>현재 <span className="font-semibold text-blue-600">{wishlist.length}개 과목</span>으로 조합합니다.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* === Footer Action Area === */}
        {wishlist.length > 0 && onRunGenerator && (
          <div className="border-t border-slate-200 bg-white p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom),12px)]">
            {step === 'list' ? (
              <button
                onClick={() => setStep('setup')}
                className="w-full rounded-xl bg-slate-900 px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg transition-transform hover:bg-slate-800 active:scale-[0.99]"
              >
                시간표 조합 생성하기 ({wishlist.length}과목)
              </button>
            ) : (
              <button
                onClick={() => {
                  onRunGenerator();
                  handleClose();
                }}
                className="w-full rounded-xl bg-blue-600 px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-[0.99]"
              >
                {targetCredits}학점 조합 만들기 시작
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistModal;
