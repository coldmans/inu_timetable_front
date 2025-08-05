import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, BookOpen, Award, X, Check } from 'lucide-react';

const TimetableCombinationResults = ({ results, onClose, onSelectCombination }) => {
  const [currentCombination, setCurrentCombination] = useState(0);

  if (!results || !results.combinations || results.combinations.length === 0) {
    return null;
  }

  const combination = results.combinations[currentCombination];
  const stats = results.statistics[currentCombination];

  // 디버깅을 위한 데이터 출력
  console.log('🔍 조합 결과 데이터:', results);
  console.log('📋 현재 조합:', combination);
  console.log('📊 통계:', stats);
  if (combination && combination.length > 0) {
    console.log('📅 첫 번째 과목 스케줄:', combination[0].schedules);
  }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🎯 시간표 조합 결과</h2>
            <p className="text-gray-600 mt-1">총 {results.totalCount}개 조합 중 {currentCombination + 1}번째</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timetable Grid */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Calendar className="mr-2" size={20} />
                  시간표 ({stats.totalCredits}학점, {stats.subjectCount}과목)
                </h3>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full border-collapse border-gray-200 table-fixed">
                    <colgroup>
                      <col className="w-12" />
                      {daysOfWeek.map(day => <col key={day} className="w-32" />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="bg-gray-50 p-1 text-center font-bold text-xs text-gray-700 border border-gray-200"></th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="bg-gray-100 p-1 text-center font-bold text-xs text-gray-700 border border-gray-200">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, index) => {
                        const isTopBorder = index > 0 && slot.endsWith('-1') && !slot.startsWith('야1');
                        const isNightTopBorder = slot === '야1-1';

                        return (
                          <tr key={slot} style={{height: '24px'}} className={`${isTopBorder ? 'border-t-2 border-gray-300' : ''} ${isNightTopBorder ? 'border-t-2 border-blue-300' : ''}`}>
                            {slot.endsWith('-1') && (
                              <td rowSpan={2} className={`text-gray-700 text-center p-1 font-medium text-xs border border-gray-200 ${slot.startsWith('야') ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'}`}>
                                {displayTimeSlots[Math.floor(index / 2)]}{slot.startsWith('야') ? '' : '교시'}
                              </td>
                            )}
                            {daysOfWeek.map(day => {
                              const cell = grid[day]?.[slot];
                              // 상반부(-1) slot에는 과목이 없으면 무조건 빈 td 추가
                              if (slot.endsWith('-1') && (!cell || !cell.span)) {
                                return <td key={`${day}-${slot}-empty`} className="empty-half"></td>;
                              }
                              if (cell && cell.span) {
                                const backgroundColor = cell.colorScheme.bg || 'bg-blue-500';
                                const borderColor = cell.colorScheme.border || 'border-blue-400';
                                return (
                                  <td key={`${day}-${slot}`} rowSpan={cell.span}
                                    className={`p-1 ${backgroundColor} ${borderColor} border-l-4 align-top`}>
                                    <div className={`text-xs font-bold ${cell.colorScheme.text} leading-tight`}>{cell.subject.subjectName}</div>
                                    <div className={`text-[10px] ${cell.colorScheme.text} opacity-80`}>{cell.subject.professor}</div>
                                  </td>
                                );
                              }
                              if (cell && !cell.span) return null;
                              return (
                                <td key={`${day}-${slot}`} className={`min-h-[14px] border-r border-gray-200 ${slot.endsWith('-2') ? 'border-b' : ''} ${slot.startsWith('야') ? 'bg-blue-50' : 'bg-white'}`}></td>
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

            {/* Subject List & Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <BookOpen className="mr-2" size={20} />
                  과목 목록
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {combination.map((subject, index) => {
                    const colors = [
                      'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800',
                      'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800',
                      'bg-teal-100 text-teal-800', 'bg-red-100 text-red-800',
                    ];
                    const colorClass = colors[index % colors.length];

                    return (
                      <div key={subject.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-800">{subject.subjectName}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>{subject.subjectType}</span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center"><User size={12} className="mr-1" />{subject.professor}</div>
                              <div className="flex items-center"><Clock size={12} className="mr-1" />{formatTimeDisplay(subject.schedules)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-800">{subject.credits}학점</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Award className="mr-2" size={20} />통계</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">총 학점</span>
                    <span className="font-bold text-blue-600">{stats.totalCredits}학점</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">과목 수</span>
                    <span className="font-bold">{stats.subjectCount}개</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">이수구분별 분포</div>
                    <div className="space-y-1">
                      {Object.entries(stats.subjectTypeDistribution).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="text-gray-600">{type}</span>
                          <span className="font-medium">{count}개</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <button onClick={handlePrevious} disabled={currentCombination === 0} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft size={16} /> 이전
            </button>
            <span className="text-sm text-gray-600">{currentCombination + 1} / {results.combinations.length}</span>
            <button onClick={handleNext} disabled={currentCombination === results.combinations.length - 1} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              다음 <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
            <button onClick={handleSelectThis} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Check size={16} /> 이 조합 선택
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableCombinationResults;