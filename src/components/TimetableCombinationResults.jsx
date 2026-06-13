import React, { useState, useMemo, useId } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, BookOpen, Award, X, Check, MessageSquare } from 'lucide-react';

import {
  parseTime,
  getCourseTypeBadgeClass,
  getCourseTypeColorScheme,
  daysOfWeek as utilDaysOfWeek,
  timeSlots,
  displayTimeSlots
} from '../utils/timetableUtils';

// --- Helper Functions (Local formatting) ---

const TimeSlotCell = ({ day, slot, index, grid }) => {
  const course = grid[day]?.[slot];
  const isFirstHalf = slot.endsWith('-1');
  const emptyClass = `border border-slate-100 ${slot.startsWith('야') ? 'bg-slate-50' : 'bg-white'}`;

  // Case 1: Course exists
  if (course) {
    if (course.isStart) {
      const backgroundColor = course.colorScheme?.bg || 'bg-blue-100';
      const textColor = course.colorScheme?.text || 'text-slate-900';
      return (
        <td
          rowSpan={course.span || 1}
          className="relative border border-slate-100 bg-white p-0"
        >
          <div className={`absolute inset-[2px] flex flex-col overflow-hidden rounded-md px-1 py-0.5 sm:px-1.5 sm:py-1 ${backgroundColor} ${textColor}`}>
            <div className="w-full break-words text-[9px] font-semibold leading-tight sm:text-[11px]">{course.subject.subjectName}</div>
            {course.subject.professor && (
              <div className="mt-0.5 hidden w-full truncate text-[8px] leading-none opacity-75 sm:block sm:text-[10px]">{course.subject.professor}</div>
            )}
          </div>
        </td>
      );
    }
    // If course exists but not start, it's covered by previous rowSpan
    return null;
  }

  // Case 2: Empty cell
  if (isFirstHalf) {
    const nextSlotIndex = index + 1;
    const nextSlot = timeSlots[nextSlotIndex]; // timeSlots global reference
    const nextCourse = grid[day]?.[nextSlot];

    // If next slot has a course starting, do NOT merge. Render just this 30min slot.
    if (nextCourse && nextCourse.isStart) {
      return (
        <td rowSpan={1} className={emptyClass}></td>
      );
    }

    // Otherwise merge 1 hour (2 slots)
    return (
      <td rowSpan={2} className={emptyClass}></td>
    );
  } else {
    // Second half (-2)
    const prevSlotIndex = index - 1;
    const prevSlot = timeSlots[prevSlotIndex];
    const prevCourse = grid[day]?.[prevSlot];

    // If previous slot was empty (no course), it rendered rowSpan=2, so we skip.
    if (!prevCourse) {
      return null;
    }

    // Previous slot was occupied (so it didn't merge us). Render single empty cell.
    return (
      <td rowSpan={1} className={emptyClass}></td>
    );
  }
};

const TimetableCombinationResults = ({ results, onClose, onSelectCombination, isApplying = false }) => {
  const [currentCombination, setCurrentCombination] = useState(0);
  const titleId = useId();

  if (!results || !results.combinations || results.combinations.length === 0) {
    return null;
  }

  const combination = results.combinations[currentCombination];
  const stats = results.statistics[currentCombination];

  const { grid, daysOfWeek, unscheduledCourses } = useMemo(() => {
    const activeDays = ['월', '화', '수', '목', '금'];
    const newGrid = {};
    activeDays.forEach(day => {
      newGrid[day] = {};
      timeSlots.forEach(slot => {
        newGrid[day][slot] = null;
      });
    });

    const getSlotIndex = (period) => {
      if (isNaN(period) || period < 1) return -1;
      return Math.round((period - 1) * 2);
    };

    const unscheduled = [];

    combination.forEach((subject) => {
      const colorScheme = getCourseTypeColorScheme(subject.subjectType);
      const times = parseTime(subject.schedules);

      if (times.length === 0) {
        unscheduled.push({ subject, colorScheme });
        return;
      }

      let mapped = false;
      times.forEach(({ day, start, end }) => {
        if (newGrid[day]) {
          const startIndex = getSlotIndex(start);
          const endIndex = getSlotIndex(end);
          const totalSlots = endIndex - startIndex;

          if (totalSlots <= 0) return;

          let isFirstSlot = true;
          mapped = true;
          for (let i = startIndex; i < endIndex; i++) {
            const slotKey = timeSlots[i];
            if (slotKey && newGrid[day][slotKey] === null) {
              newGrid[day][slotKey] = {
                subject,
                isStart: isFirstSlot,
                span: totalSlots,
                colorScheme
              };
              isFirstSlot = false;
            }
          }
        }
      });

      if (!mapped) {
        unscheduled.push({ subject, colorScheme });
      }
    });

    return { grid: newGrid, daysOfWeek: activeDays, unscheduledCourses: unscheduled };
  }, [combination]);

  const handlePrevious = () => {
    if (isApplying) return;
    setCurrentCombination(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (isApplying) return;
    setCurrentCombination(prev => Math.min(results.combinations.length - 1, prev + 1));
  };

  const handleSelectThis = () => {
    if (onSelectCombination) {
      onSelectCombination(combination);
    }
  };

  const formatTimeDisplay = (subject) => {
    const schedules = subject?.schedules;
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return '온라인';

    const dayMapping = {
      'MONDAY': '월', 'TUESDAY': '화', 'WEDNESDAY': '수', 'THURSDAY': '목', 'FRIDAY': '금'
    };

    return schedules.map(schedule => {
      const day = dayMapping[schedule.dayOfWeek] || schedule.dayOfWeek;
      let start = schedule.startTime;
      let end = schedule.endTime;

      const formatPeriod = (time) => {
        if (time >= 10) return `야${time - 9}`;
        return time;
      }

      return `${day} ${formatPeriod(start)}~${formatPeriod(end)}교시`;
    }).join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 backdrop-blur-sm">
      {/* Mobile: Full screen / Desktop: Centered card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={isApplying}
        className="modal-panel flex w-full h-[100svh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl lg:max-w-6xl flex-col overflow-hidden bg-white sm:rounded-2xl sm:ring-1 sm:ring-slate-200 shadow-2xl"
      >

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">시간표 조합</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {results.totalCount}개 중 {currentCombination + 1}번째
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="icon-btn h-10 w-10 flex-shrink-0"
            aria-label="시간표 조합 결과 닫기"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-3 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Timetable Grid */}
            <div className="lg:col-span-2">
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                <div className="mb-3 sm:mb-4 flex items-center gap-2 text-slate-700">
                  <Calendar size={18} className="text-slate-400" />
                  <span className="text-sm sm:text-base font-semibold text-slate-900">
                    시간표 <span className="text-xs sm:text-sm font-normal text-slate-500">({stats.totalCredits}학점 · {stats.subjectCount}과목)</span>
                  </span>
                </div>
                {/* Horizontal scroll wrapper for mobile */}
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                  <div className="min-w-[320px] sm:min-w-0 overflow-hidden rounded-lg sm:rounded-xl border border-slate-200 bg-white">
                    <table className="w-full table-fixed border-collapse text-[10px] sm:text-xs text-slate-700">
                      <colgroup>
                        <col className="w-8 sm:w-10" />
                        {daysOfWeek.map(day => <col key={day} />)}
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="border border-slate-200 bg-slate-50 p-0.5 sm:p-1"></th>
                          {daysOfWeek.map(day => (
                            <th key={day} className="border border-slate-200 bg-slate-50 p-0.5 sm:p-1 text-center text-[10px] sm:text-[11px] font-semibold text-slate-500">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot, index) => {
                          const isTopBorder = index > 0 && slot.endsWith('-1') && !slot.startsWith('야1');
                          const isNightTopBorder = slot === '야1-1';
                          return (
                            <tr
                              key={slot}
                              style={{ height: '20px' }}
                              className={`${isTopBorder ? 'border-t border-slate-200' : ''} ${isNightTopBorder ? 'border-t border-blue-200' : ''}`}
                            >
                              {slot.endsWith('-1') && (
                                <td
                                  rowSpan={2}
                                  className={`border border-slate-200 p-0.5 sm:p-1 text-center text-[9px] sm:text-[11px] font-medium ${slot.startsWith('야') ? 'bg-slate-100 text-blue-600' : 'bg-slate-50 text-slate-500'}`}
                                >
                                  {displayTimeSlots[Math.floor(index / 2)]}
                                </td>
                              )}
                              {daysOfWeek.map(day => (
                                <TimeSlotCell
                                  key={`${day}-${slot}`}
                                  day={day}
                                  slot={slot}
                                  index={index}
                                  grid={grid}
                                />
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Unscheduled / Online Courses */}
                {unscheduledCourses.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <h4 className="text-xs font-semibold text-slate-500">온라인 · 시간 미지정</h4>
                    </div>
                    <div className="course-list">
                      {unscheduledCourses.map(({ subject, colorScheme }, idx) => (
                        <div
                          key={subject.id || idx}
                          className="course-list-row py-2.5"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate text-xs font-semibold text-slate-900">{subject.subjectName}</div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`course-type-badge ${colorScheme.bg} ${colorScheme.text}`}>{subject.subjectType}</span>
                              <span className="meta-chip bg-white">온라인</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subject List & Stats */}
            <div className="space-y-4 sm:space-y-6">
              {/* Subject List */}
              <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3 text-slate-700 sm:px-4">
                  <BookOpen size={18} className="text-slate-400" />
                  <span className="text-sm sm:text-base font-semibold text-slate-900">과목 목록</span>
                </div>
                <div className="course-list max-h-56 overflow-y-auto sm:max-h-64">
                  {combination.map((subject) => {
                    const colorClass = getCourseTypeBadgeClass(subject.subjectType);

                    return (
                      <div key={subject.id} className="course-list-row">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-slate-900">{subject.subjectName}</span>
                              <span className={`course-type-badge ${colorClass}`}>{subject.subjectType}</span>
                              <span className="meta-chip flex-shrink-0 bg-white">{subject.credits}학점</span>
                            </div>
                            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-600">
                              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                <User size={11} className="flex-shrink-0 text-slate-400" />
                                <span className="truncate">{subject.professor}</span>
                              </span>
                              <span className="meta-chip min-w-0 bg-white">
                                <Clock size={11} className="flex-shrink-0 text-slate-400" />
                                <span className="truncate">{formatTimeDisplay(subject)}</span>
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <a
                                href={`https://everytime.kr/lecture/search?keyword=${encodeURIComponent(subject.subjectName)}&condition=name`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-chip-link"
                              >
                                <MessageSquare size={11} /> 강의평
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats - Hidden on very small screens */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:block sm:rounded-2xl">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-slate-700">
                  <Award size={18} className="text-slate-400" />
                  <span className="text-sm sm:text-base font-semibold text-slate-900">통계</span>
                </div>
                <div className="space-y-2 p-4 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span>총 학점</span>
                    <span className="font-semibold text-slate-900">{stats.totalCredits}학점</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span>과목 수</span>
                    <span className="font-semibold text-slate-900">{stats.subjectCount}개</span>
                  </div>
                  <div className="pt-1">
                    <div className="mb-1.5 text-xs font-medium text-slate-700">이수구분별</div>
                    <div className="space-y-0.5">
                      {Object.entries(stats.subjectTypeDistribution).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-xs">
                          <span>{type}</span>
                          <span className="font-medium text-slate-700">{count}개</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Responsive layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          {/* Navigation */}
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <button
              onClick={handlePrevious}
              disabled={currentCombination === 0 || isApplying}
              className="btn-secondary h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
            >
              <ChevronLeft size={14} /> 이전
            </button>
            <span className="text-xs sm:text-sm text-slate-500 min-w-[60px] text-center">{currentCombination + 1} / {results.combinations.length}</span>
            <button
              onClick={handleNext}
              disabled={currentCombination === results.combinations.length - 1 || isApplying}
              className="btn-secondary h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
            >
              다음 <ChevronRight size={14} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="btn-secondary h-11 flex-1 text-sm sm:h-10 sm:flex-none"
            >
              닫기
            </button>
            <button
              onClick={handleSelectThis}
              disabled={isApplying}
              className="btn-primary h-11 flex-1 text-sm sm:h-10 sm:flex-none"
            >
              {isApplying ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  적용 중
                </>
              ) : (
                <>
                  <Check size={14} /> 이 조합 선택
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableCombinationResults;
