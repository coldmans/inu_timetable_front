import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, BookOpen, Award, X, Check } from 'lucide-react';

// --- Helper Functions & Constants (Ported from App.jsx) ---

const convertToPeriod = (timeValue) => {
  const PERIOD_START_HOUR_OFFSET = 8;
  const REAL_TIME_THRESHOLD = 13;
  let period = parseFloat(timeValue);

  if (typeof timeValue === 'string' && timeValue.includes(':')) {
    const [hour, minute] = timeValue.split(':').map(parseFloat);
    period = hour + (minute / 60) - PERIOD_START_HOUR_OFFSET;
  }

  // [Safety] 숫자로만 들어왔는데 13 이상이면 24시간제(Real Time)로 간주하고 변환
  if (period >= REAL_TIME_THRESHOLD) {
    period -= PERIOD_START_HOUR_OFFSET;
  }

  if (isNaN(period)) return 0;

  // 교시는 0.5 단위로 반올림 (Grid 매핑을 위해)
  return Math.round(period * 2) / 2;
};

const parseTime = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) return [];

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
    const startPeriod = convertToPeriod(schedule.startTime);
    const endPeriod = convertToPeriod(schedule.endTime);

    // 요일 변환 - 대문자 변환 후 매핑 또는 원본 유지
    const dayKey = schedule.dayOfWeek ? schedule.dayOfWeek.toUpperCase() : schedule.dayOfWeek;
    const day = dayMapping[dayKey] || schedule.dayOfWeek;

    return {
      day: day,
      start: startPeriod,
      end: endPeriod,
    };
  });
};

const timeSlots = [
  // 주간 교시: 각 교시마다 2개 슬롯 (상반부, 하반부)
  '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '5-1', '5-2',
  '6-1', '6-2', '7-1', '7-2', '8-1', '8-2', '9-1', '9-2',
  // 야간 교시: 각 교시마다 2개 슬롯
  '야1-1', '야1-2', '야2-1', '야2-2', '야3-1', '야3-2', '야4-1', '야4-2'
];

const displayTimeSlots = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, '야1', '야2', '야3', '야4'
];

const TimeSlotCell = ({ day, slot, index, grid }) => {
  const course = grid[day]?.[slot];
  const isFirstHalf = slot.endsWith('-1');
  const emptyClass = `border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-100' : 'bg-white'}`;

  // Case 1: Course exists
  if (course) {
    if (course.isStart) {
      const backgroundColor = course.colorScheme?.bg || 'bg-blue-100';
      const borderColor = course.colorScheme?.border || 'border-blue-300';
      const textColor = course.colorScheme?.text || 'text-slate-900';
      return (
        <td
          rowSpan={course.span || 1}
          className={`align-top p-0.5 sm:p-1 ${backgroundColor} ${borderColor} ${textColor} border transition-colors hover:brightness-95 overflow-hidden`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center overflow-hidden">
            <div className="w-full px-0.5 text-[9px] sm:text-[11px] font-semibold leading-tight break-words overflow-hidden">{course.subject.subjectName}</div>
            {course.subject.professor && (
              <div className="w-full px-0.5 text-[8px] sm:text-[10px] leading-none opacity-80 truncate hidden sm:block">{course.subject.professor}</div>
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

const TimetableCombinationResults = ({ results, onClose, onSelectCombination }) => {
  const [currentCombination, setCurrentCombination] = useState(0);

  if (!results || !results.combinations || results.combinations.length === 0) {
    return null;
  }

  const combination = results.combinations[currentCombination];
  const stats = results.statistics[currentCombination];

  const createTimetableGrid = (subjects) => {
    const daysOfWeek = ['월', '화', '수', '목', '금'];
    const grid = {};
    daysOfWeek.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(slot => {
        grid[day][slot] = null;
      });
    });

    const getSlotIndex = (period) => {
      if (isNaN(period) || period < 1) return -1;
      return Math.round((period - 1) * 2);
    };

    subjects.forEach((subject, index) => {
      const colors = [
        { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
        { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
        { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
        { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
        { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
        { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
        { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800' },
        { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-800' },
        { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
        { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
      ];

      const colorScheme = colors[index % colors.length];

      const times = parseTime(subject.schedules);
      times.forEach(({ day, start, end }) => {
        if (grid[day]) {
          const startIndex = getSlotIndex(start);
          const endIndex = getSlotIndex(end);
          const totalSlots = endIndex - startIndex;

          if (totalSlots <= 0) return;

          let isFirstSlot = true;
          for (let i = startIndex; i < endIndex; i++) {
            const slotKey = timeSlots[i];
            if (slotKey && grid[day][slotKey] === null) {
              grid[day][slotKey] = {
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
    });

    return { grid, daysOfWeek };
  };

  const { grid, daysOfWeek } = createTimetableGrid(combination);

  const handlePrevious = () => {
    setCurrentCombination(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentCombination(prev => Math.min(results.combinations.length - 1, prev + 1));
  };

  const handleSelectThis = () => {
    if (onSelectCombination) {
      onSelectCombination(combination);
    }
  };

  const formatTimeDisplay = (schedules) => {
    if (!schedules || !Array.isArray(schedules)) return '시간 미정';

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
      <div className="flex w-full h-[100svh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl lg:max-w-6xl flex-col overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-slate-200 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">시간표 조합</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {results.totalCount}개 중 {currentCombination + 1}번째
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-3 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Timetable Grid */}
            <div className="lg:col-span-2">
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
                <div className="mb-3 sm:mb-4 flex items-center gap-2 text-slate-700">
                  <Calendar size={18} className="text-slate-400" />
                  <span className="text-sm sm:text-base font-semibold text-slate-900">
                    시간표 <span className="text-xs sm:text-sm font-normal text-slate-500">({stats.totalCredits}학점 · {stats.subjectCount}과목)</span>
                  </span>
                </div>
                {/* Horizontal scroll wrapper for mobile */}
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                  <div className="min-w-[320px] sm:min-w-0 overflow-hidden rounded-lg sm:rounded-xl border border-slate-200 bg-white shadow-sm">
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
              </div>
            </div>

            {/* Subject List & Stats */}
            <div className="space-y-4 sm:space-y-6">
              {/* Subject List */}
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="mb-3 sm:mb-4 flex items-center gap-2 text-slate-700">
                  <BookOpen size={18} className="text-slate-400" />
                  <span className="text-sm sm:text-base font-semibold text-slate-900">과목 목록</span>
                </div>
                <div className="max-h-48 sm:max-h-60 space-y-2 sm:space-y-3 overflow-y-auto">
                  {combination.map((subject, index) => {
                    const colors = [
                      'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-indigo-100 text-indigo-800',
                      'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800',
                      'bg-teal-100 text-teal-800', 'bg-sky-100 text-sky-800', 'bg-red-100 text-red-800',
                      'bg-orange-100 text-orange-800',
                    ];
                    const colorClass = colors[index % colors.length];

                    return (
                      <div key={subject.id} className="rounded-lg sm:rounded-xl border border-slate-200 p-2 sm:p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-900 truncate">{subject.subjectName}</span>
                              <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>{subject.subjectType}</span>
                            </div>
                            <div className="space-y-0.5 text-xs text-slate-600">
                              <div className="flex items-center gap-1"><User size={10} className="text-slate-400" />{subject.professor}</div>
                              <div className="flex items-center gap-1 truncate"><Clock size={10} className="text-slate-400" />{formatTimeDisplay(subject.schedules)}</div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-xs sm:text-sm font-medium text-slate-700">{subject.credits}학점</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats - Hidden on very small screens */}
              <div className="hidden sm:block rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="mb-3 sm:mb-4 flex items-center gap-2 text-slate-700">
                  <Award size={18} className="text-slate-400" />
                  <span className="text-sm sm:text-base font-semibold text-slate-900">통계</span>
                </div>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>총 학점</span>
                    <span className="font-semibold text-slate-900">{stats.totalCredits}학점</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
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
              disabled={currentCombination === 0}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> 이전
            </button>
            <span className="text-xs sm:text-sm text-slate-500 min-w-[60px] text-center">{currentCombination + 1} / {results.combinations.length}</span>
            <button
              onClick={handleNext}
              disabled={currentCombination === results.combinations.length - 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음 <ChevronRight size={14} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-full border border-slate-300 px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              닫기
            </button>
            <button
              onClick={handleSelectThis}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
            >
              <Check size={14} /> 이 조합 선택
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableCombinationResults;
