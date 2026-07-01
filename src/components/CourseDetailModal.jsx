import React, { useRef } from 'react';
import { X, Clock, Star, MapPin, BookOpen, User, Calendar, Tag, Plus } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import useModalDismiss from '../hooks/useModalDismiss';

// 시간 정보를 한국어 표시용으로 포맷하는 함수
const formatTimeDisplay = (course) => {
  const schedules = course?.schedules;
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return '온라인';

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
      timeStr = `${schedule.startTime}~${schedule.endTime}`;
    } else {
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

const InfoRow = ({ icon: Icon, label, value, valueClass = 'text-slate-900' }) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <div className="flex items-center gap-2 text-[13px] text-slate-500">
      <Icon size={15} className="text-slate-400" />
      {label}
    </div>
    <p className={`min-w-0 truncate text-right text-sm font-medium ${valueClass}`}>{value}</p>
  </div>
);

const CourseDetailModal = ({ isOpen, onClose, course, onAddToTimetable }) => {
  const panelRef = useRef(null);
  useFocusTrap(isOpen && !!course, panelRef);
  useModalDismiss(isOpen && !!course, onClose);

  if (!isOpen || !course) return null;

  const classMethodLabel =
    course.classMethod === 'ONLINE' ? '온라인' :
    course.classMethod === 'OFFLINE' ? '오프라인' :
    course.classMethod === 'HYBRID' ? '혼합' : course.classMethod;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-detail-title"
        className="modal-panel flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 focus:outline-none"
      >
        {/* 헤더 */}
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex flex-shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${course.color} ${course.textColor}`}>
                  {course.type}
                </span>
                <h2 id="course-detail-title" className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-900">
                  {course.name}
                </h2>
              </div>
              <p className="mt-1 text-[13px] text-slate-500">{course.department}</p>
            </div>
            <button onClick={onClose} aria-label="닫기" className="icon-btn -mr-1 flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <div className="flex items-start gap-2.5">
              <Clock size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-600">수업 시간</p>
                <p className="mt-0.5 text-[15px] font-semibold text-blue-900">
                  {formatTimeDisplay(course)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            <InfoRow icon={Star} label="학점" value={`${course.credits}학점`} />
            <InfoRow icon={User} label="담당교수" value={course.professor || '미정'} />
            {course.location && <InfoRow icon={MapPin} label="강의실" value={course.location} />}
            {course.grade && <InfoRow icon={BookOpen} label="대상 학년" value={`${course.grade}학년`} />}
            {course.classMethod && <InfoRow icon={Calendar} label="수업 방식" value={classMethodLabel} />}
            {course.isNight && <InfoRow icon={Tag} label="특이사항" value="야간 수업" valueClass="text-violet-600" />}
          </div>

          {course.description && (
            <div className="mt-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <h3 className="text-[13px] font-semibold text-slate-700">과목 설명</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{course.description}</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5 sm:px-6">
          <button onClick={onClose} className="btn-secondary">
            닫기
          </button>
          {onAddToTimetable && (
            <button
              onClick={() => {
                onAddToTimetable(course);
                onClose();
              }}
              className="btn-primary"
            >
              <Plus size={15} /> 시간표에 추가
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailModal;
