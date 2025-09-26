import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, BookOpen, Award, X, Check } from 'lucide-react';

const TimetableCombinationResults = ({ results, onClose, onSelectCombination }) => {
  const [currentCombination, setCurrentCombination] = useState(0);

  if (!results || !results.combinations || results.combinations.length === 0) {
    return null;
  }

  const combination = results.combinations[currentCombination];
  const stats = results.statistics[currentCombination];

  const createTimetableGrid = (subjects) => {
    const daysOfWeek = ['월', '화', '수', '목', '금'];
    
    // 그리드를 2배로 만들기 (30분 단위)
    const timeSlots = [
      // 주간 교시: 각 교시마다 2개 슬롯 (상반부, 하반부)
      '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '5-1', '5-2',
      '6-1', '6-2', '7-1', '7-2', '8-1', '8-2', '9-1', '9-2',
      // 야간 교시: 각 교시마다 2개 슬롯
      '야1-1', '야1-2', '야2-1', '야2-2', '야3-1', '야3-2', '야4-1', '야4-2'
    ];

    // 사용자에게 보여줄 교시 (2개씩 묶어서 하나로)
    const displayTimeSlots = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, '야1', '야2', '야3', '야4'
    ];

    const grid = {};
    daysOfWeek.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(slot => {
        grid[day][slot] = null;
      });
    });

    subjects.forEach((subject, index) => {
      const colors = [
        { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
        { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
        { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
        { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
        { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
        { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
        { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800' },
        { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
      ];
      
      const colorScheme = colors[index % colors.length];
      
      subject.schedules.forEach(schedule => {
        // 영어 요일을 한국어로 변환
        const dayMapping = {
          'MONDAY': '월',
          'TUESDAY': '화', 
          'WEDNESDAY': '수',
          'THURSDAY': '목',
          'FRIDAY': '금',
          'SATURDAY': '토',
          'SUNDAY': '일'
        };
        
        const dayKor = dayMapping[schedule.dayOfWeek] || schedule.dayOfWeek;
        let start, end;
        
        // 시간 데이터를 30분 단위로 변환
        if (typeof schedule.startTime === 'string' && schedule.startTime.includes(':')) {
          const [hour, minute] = schedule.startTime.split(':').map(Number);
          start = hour + (minute / 60) - 8; // 09:00 = 1.0, 09:30 = 1.5
        } else {
          start = schedule.startTime;
        }
        
        if (typeof schedule.endTime === 'string' && schedule.endTime.includes(':')) {
          const [hour, minute] = schedule.endTime.split(':').map(Number);
          end = hour + (minute / 60) - 8; // 12:00 = 4.0, 12:30 = 4.5
        } else {
          end = schedule.endTime;
        }
        
        // 30분 단위로 정확히 칸을 나누는 로직
        const getSlotKeys = (start, end, night = false) => {
          const slots = [];
          let current = start;
          while (current < end) {
            const period = night ? Math.floor(current - 9) : Math.floor(current);
            const half = (current % 1 === 0.5) ? 2 : 1;
            slots.push(`${night ? '야' : ''}${period}-${half}`);
            current += 0.5;
          }
          return slots;
        };
        const isNight = start >= 10;
        const slotKeys = getSlotKeys(start, end, isNight);
        // 칸 채우기
        slotKeys.forEach((slotKey, i) => {
          if (grid[dayKor] && grid[dayKor][slotKey] === null) {
            grid[dayKor][slotKey] = {
              subject,
              isStart: i === 0,
              colorScheme
            };
          }
        });
        // span 정보 업데이트 (맨 첫 칸에만 span)
        if (slotKeys.length > 0 && grid[dayKor][slotKeys[0]]) {
          grid[dayKor][slotKeys[0]].span = slotKeys.length;
        }
      });
    });

    return { grid, daysOfWeek, timeSlots, displayTimeSlots };
  };

  const { grid, daysOfWeek, timeSlots, displayTimeSlots } = createTimetableGrid(combination);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">시간표 조합 결과</h2>
            <p className="mt-1 text-sm text-slate-500">총 {results.totalCount}개 조합 중 {currentCombination + 1}번째</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-slate-700">
                  <Calendar size={20} className="text-slate-400" />
                  <span className="text-base font-semibold text-slate-900">
                    시간표 <span className="ml-1 text-sm font-normal text-slate-500">({stats.totalCredits}학점 · {stats.subjectCount}과목)</span>
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full table-fixed border-collapse text-xs text-slate-700">
                    <colgroup>
                      <col className="w-10" />
                      {daysOfWeek.map(day => <col key={day} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border border-slate-200 bg-slate-50 p-1"></th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="border border-slate-200 bg-slate-50 p-1 text-center text-[11px] font-semibold text-slate-500">
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
                            style={{ height: '24px' }}
                            className={`${isTopBorder ? 'border-t border-slate-200' : ''} ${isNightTopBorder ? 'border-t border-blue-200' : ''}`}
                          >
                            {slot.endsWith('-1') && (
                              <td
                                rowSpan={2}
                                className={`border border-slate-200 p-1 text-center text-[11px] font-medium ${slot.startsWith('야') ? 'bg-slate-100 text-blue-600' : 'bg-slate-50 text-slate-500'}`}
                              >
                                {displayTimeSlots[Math.floor(index / 2)]}{slot.startsWith('야') ? '' : '교시'}
                              </td>
                            )}
                            {daysOfWeek.map(day => {
                              const cell = grid[day]?.[slot];

                              if (slot.endsWith('-1') && (!cell || !cell.span)) {
                                return <td key={`${day}-${slot}-empty`} className="border border-slate-200 bg-white"></td>;
                              }
                              if (cell && cell.span) {
                                const backgroundColor = cell.colorScheme?.bg || 'bg-blue-100';
                                const borderColor = cell.colorScheme?.border || 'border-blue-300';
                                const textColor = cell.colorScheme?.text || 'text-slate-900';

                                return (
                                  <td
                                    key={`${day}-${slot}`}
                                    rowSpan={cell.span}
                                    className={`align-top p-1 ${backgroundColor} ${borderColor} ${textColor} border text-[11px] leading-tight`}
                                  >
                                    <div className="font-medium">{cell.subject.subjectName}</div>
                                    <div className="text-[10px] opacity-70">{cell.subject.professor}</div>
                                  </td>
                                );
                              }
                              if (cell && !cell.span) {
                                return null;
                              }
                              return (
                                <td key={`${day}-${slot}`} className={`border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-100' : 'bg-white'}`}></td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-slate-700">
                  <BookOpen size={20} className="text-slate-400" />
                  <span className="text-base font-semibold text-slate-900">과목 목록</span>
                </div>
                <div className="max-h-60 space-y-3 overflow-y-auto">
                  {combination.map((subject, index) => {
                    const colors = [
                      'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800',
                      'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800',
                      'bg-teal-100 text-teal-800', 'bg-red-100 text-red-800',
                    ];
                    const colorClass = colors[index % colors.length];

                    return (
                      <div key={subject.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{subject.subjectName}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>{subject.subjectType}</span>
                            </div>
                            <div className="space-y-1 text-sm text-slate-600">
                              <div className="flex items-center gap-1.5"><User size={12} className="text-slate-400" />{subject.professor}</div>
                              <div className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" />{formatTimeDisplay(subject.schedules)}</div>
                            </div>
                          </div>
                          <div className="text-right text-sm font-medium text-slate-700">{subject.credits}학점</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-slate-700">
                  <Award size={20} className="text-slate-400" />
                  <span className="text-base font-semibold text-slate-900">통계</span>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>총 학점</span>
                    <span className="font-semibold text-slate-900">{stats.totalCredits}학점</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>과목 수</span>
                    <span className="font-semibold text-slate-900">{stats.subjectCount}개</span>
                  </div>
                  <div className="pt-2">
                    <div className="mb-2 text-sm font-medium text-slate-700">이수구분별 분포</div>
                    <div className="space-y-1">
                      {Object.entries(stats.subjectTypeDistribution).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
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

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentCombination === 0}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} /> 이전
            </button>
            <span className="text-sm text-slate-500">{currentCombination + 1} / {results.combinations.length}</span>
            <button
              onClick={handleNext}
              disabled={currentCombination === results.combinations.length - 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음 <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              닫기
            </button>
            <button
              onClick={handleSelectThis}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
            >
              <Check size={16} /> 이 조합 선택
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableCombinationResults;
