import React from 'react';
import { X, Clock, User, BookOpen, Trash2, Heart, Info } from 'lucide-react';

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
  if (!isOpen) return null;

  const totalCredits = courses.reduce((total, course) => total + (course.credits || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">내 시간표</h2>
            <p className="mt-1 text-sm text-slate-500">총 {courses.length}개 과목 • {totalCredits}학점</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 px-6 py-6">
          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <p className="text-lg font-medium text-slate-600">아직 추가된 과목이 없어요</p>
              <p className="mt-2 text-sm text-slate-400">과목을 검색해서 시간표에 담아보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course, index) => (
                <div
                  key={course.id || index}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{course.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${course.color} ${course.textColor}`}>
                          {course.type}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {course.credits}학점
                        </span>
                      </div>

                      <div className="mb-3 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <span>{course.professor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-slate-400" />
                          <span>{course.department}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Clock size={16} />
                        <span className="font-medium">{formatTimeDisplay(course.schedules)}</span>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => onViewCourseDetails(course)}
                        className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="상세 정보 보기"
                      >
                        <Info size={16} />
                      </button>
                      <button
                        onClick={() => onAddToWishlist(course)}
                        className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                        title="위시리스트에 담기"
                      >
                        <Heart size={16} />
                      </button>
                      <button
                        onClick={() => onRemoveCourse(course)}
                        className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600"
                        title="시간표에서 제거"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              총 {courses.length}개 과목 • {totalCredits}학점
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
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
