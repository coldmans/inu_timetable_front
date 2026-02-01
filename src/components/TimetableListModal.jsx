import React, { useState } from 'react';
import { X, Clock, User, BookOpen, Trash2, Heart, Info, MessageSquare, LayoutList, Grid } from 'lucide-react';
import TimetableGrid from './TimetableGrid';

// 시간 표시를 위한 헬퍼 함수
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
      // 교시 번호 형식 (야간 교시 처리 포함)
      let startDisplay = schedule.startTime;
      let endDisplay = schedule.endTime;

      if (schedule.startTime >= 10) {
        startDisplay = `야${schedule.startTime - 9}`;
        endDisplay = `야${schedule.endTime - 9}`;
      }

      timeStr = `${startDisplay}~${endDisplay}교시`;
    }

    return `${day} ${timeStr}`;
  }).join(', ');
};

const TimetableListModal = ({
  isOpen,
  onClose,
  courses,
  onRemoveCourse,
  onAddToWishlist,
  onViewCourseDetails
}) => {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  if (!isOpen) return null;

  const totalCredits = courses.reduce((total, course) => total + (course.credits || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 backdrop-blur-sm">
      {/* Mobile: Full screen / Desktop: Centered card */}
      <div className="flex w-full h-[100svh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl flex-col overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-slate-200 shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-col border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">내 시간표</h2>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">총 {courses.length}개 과목 • {totalCredits}학점</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex border-t border-slate-100 px-4 py-2 sm:px-6">
            <div className="flex w-full rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutList size={14} />
                목록 보기
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Grid size={14} />
                시간표 보기
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {courses.length === 0 ? (
            <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 sm:py-12 text-center">
              <p className="text-base sm:text-lg font-medium text-slate-600">아직 추가된 과목이 없어요</p>
              <p className="mt-2 text-xs sm:text-sm text-slate-400">과목을 검색해서 시간표에 담아보세요.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3 sm:space-y-4">
              {courses.map((course, index) => (
                <div
                  key={course.id || index}
                  className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 shadow-sm transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{course.name}</h3>
                        <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold ${course.color} ${course.textColor}`}>
                          {course.type}
                        </span>
                        <span className="flex-shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-blue-700">
                          {course.credits}학점
                        </span>
                      </div>

                      <div className="mb-2 sm:mb-3 grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 md:grid-cols-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <User size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{course.professor}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <BookOpen size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{course.department}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-600">
                        <Clock size={14} className="flex-shrink-0" />
                        <span className="font-medium">{formatTimeDisplay(course.schedules)}</span>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                      <a
                        href={`https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-1.5 sm:p-2 text-slate-500 transition-colors hover:bg-green-100 hover:text-green-700"
                        title="강의평 보기"
                      >
                        <MessageSquare size={14} className="sm:w-4 sm:h-4" />
                      </a>
                      <button
                        onClick={() => onViewCourseDetails(course)}
                        className="rounded-full p-1.5 sm:p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="상세 정보 보기"
                      >
                        <Info size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onAddToWishlist(course)}
                        className="rounded-full p-1.5 sm:p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                        title="위시리스트에 담기"
                      >
                        <Heart size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveCourse(course)}
                        className="rounded-full p-1.5 sm:p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600"
                        title="시간표에서 제거"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full">
              <TimetableGrid
                courses={courses}
                onRemoveCourse={onRemoveCourse}
                onAddToWishlist={onAddToWishlist}
                onViewCourseDetails={onViewCourseDetails}
                showTitle={false}
                isMobile={true}
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm text-slate-500">
              총 {courses.length}개 과목 • {totalCredits}학점
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-300 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableListModal;
