import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import DepartmentFilterButton from './DepartmentFilterButton';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useCloseOnDesktop from '../hooks/useCloseOnDesktop';
import useFocusTrap from '../hooks/useFocusTrap';
import { UNASSIGNED_TIME_FILTER, courseTypes, creditOptions, filterDaysOfWeek, grades } from '../utils/timetableUtils';

const TIME_PICKER_DAYS = ['월', '화', '수', '목', '금', '토'];
// 24시 기준 표시 시간대(8시~23시). 교시 변환은 시각-8 (9시 = 1교시).
const TIME_PICKER_HOURS = Array.from({ length: 16 }, (_, index) => 8 + index);

const MobileSingleFilterSheet = ({
  field,
  filters,
  setFilters,
  onClose,
  majorShortcuts,
  departmentGroups
}) => {
  const panelRef = useRef(null);
  // 에타식 시간 그리드 픽커의 임시 선택값. { 요일: [시각,...] } — 셀 단위 자유 토글.
  const [draftBlocks, setDraftBlocks] = useState({});

  useEffect(() => {
    if (field !== 'time') return;
    // 저장된 구간([시작시, 끝시))을 셀 목록으로 펼쳐 초기화한다.
    const initial = {};
    Object.entries(filters.timeBlocks || {}).forEach(([day, [startHour, endHour]]) => {
      initial[day] = TIME_PICKER_HOURS.filter(hour => hour >= startHour && hour < endHour);
    });
    setDraftBlocks(initial);
    // filters 는 시트가 열리는 시점 스냅샷만 필요하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  const isHourSelected = (day, hour) => (draftBlocks[day] || []).includes(hour);

  const toggleHourCell = (day, hour) => {
    setDraftBlocks(prev => {
      const current = prev[day] || [];
      const next = current.includes(hour)
        ? current.filter(value => value !== hour)
        : [...current, hour].sort((a, b) => a - b);
      const result = { ...prev, [day]: next };
      if (next.length === 0) delete result[day];
      return result;
    });
  };

  const toggleWholeDay = (day) => {
    setDraftBlocks(prev => {
      const allSelected = (prev[day] || []).length === TIME_PICKER_HOURS.length;
      const result = { ...prev };
      if (allSelected) delete result[day];
      else result[day] = [...TIME_PICKER_HOURS];
      return result;
    });
  };

  const toggleWholeHour = (hour) => {
    setDraftBlocks(prev => {
      const allSelected = TIME_PICKER_DAYS.every(day => (prev[day] || []).includes(hour));
      const result = {};
      TIME_PICKER_DAYS.forEach(day => {
        const current = prev[day] || [];
        const next = allSelected
          ? current.filter(value => value !== hour)
          : (current.includes(hour) ? current : [...current, hour].sort((a, b) => a - b));
        if (next.length > 0) result[day] = next;
      });
      return result;
    });
  };

  const applyTimeDraft = () => {
    // 요일별로 이어진 하나의 구간(최소~최대+1시)으로 적용한다.
    const blocks = {};
    Object.entries(draftBlocks).forEach(([day, hours]) => {
      if (hours.length === 0) return;
      blocks[day] = [Math.min(...hours), Math.max(...hours) + 1];
    });
    setFilters(prev => ({
      ...prev,
      timeBlocks: blocks,
      // 기존 단일 요일/교시 필터와 중복 적용되지 않도록 함께 초기화한다.
      dayOfWeek: prev.dayOfWeek === UNASSIGNED_TIME_FILTER ? prev.dayOfWeek : '전체',
      startTime: '전체',
      endTime: '전체',
    }));
    onClose();
  };
  useFocusTrap(!!field && field !== 'department', panelRef);
  useBodyScrollLock(!!field && field !== 'department');
  useCloseOnDesktop(!!field && field !== 'department', onClose);

  useEffect(() => {
    if (!field) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [field, onClose]);

  if (!field) {
    return null;
  }

  const titleMap = {
    department: '학과',
    subjectType: '이수구분',
    grade: '학년',
    credits: '학점',
    dayOfWeek: '요일',
    time: '시간'
  };

  const applySimple = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    onClose();
  };

  const applyDay = (value) => {
    setFilters(prev => ({
      ...prev,
      dayOfWeek: value,
      startTime: value === UNASSIGNED_TIME_FILTER ? '전체' : prev.startTime,
      endTime: value === UNASSIGNED_TIME_FILTER ? '전체' : prev.endTime,
      timeBlocks: value === UNASSIGNED_TIME_FILTER ? {} : prev.timeBlocks
    }));
    onClose();
  };

  const renderOptions = (key, options, onPick, { columnsClass = 'grid-cols-2', formatLabel } = {}) => (
    <div className={`grid ${columnsClass} gap-2`}>
      {options.map(opt => {
        const selected = String(filters[key]) === String(opt);
        const label = formatLabel ? formatLabel(opt) : (opt === '전체' ? '전체' : opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            aria-pressed={selected}
            className={`h-11 rounded-xl px-3 text-sm transition-colors ${
              selected
                ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-inset ring-blue-200'
                : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  // 학과는 자체 검색/그룹 UI(DepartmentFilterButton)를 단독으로 연다(바텀시트 이중 중첩 방지).
  if (field === 'department') {
    return (
      <DepartmentFilterButton
        value={filters.department}
        departmentGroups={departmentGroups}
        majorShortcuts={majorShortcuts}
        defaultOpen
        hideTrigger
        onClose={onClose}
        onChange={(event) => {
          setFilters(prev => ({ ...prev, department: event.target.value }));
          onClose();
        }}
      />
    );
  }

  return (
    <div className={`fixed inset-0 z-[65] flex justify-center md:hidden ${field === 'time' ? 'items-stretch bg-white' : 'items-end bg-slate-950/35 p-0 backdrop-blur-sm'}`} role="dialog" aria-modal="true" aria-label={`${titleMap[field]} 필터`}>
      {/* 시간 그리드는 svh 고정: dvh 는 iOS 브라우저 바 출몰 시 행 높이가 출렁여 선택 셀이 어긋나 보인다 */}
      <div ref={panelRef} tabIndex={-1} className={`modal-panel flex w-full flex-col overflow-hidden bg-white focus:outline-none ${field === 'time' ? 'h-[100svh]' : 'max-h-[80svh] rounded-t-2xl shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10'}`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">{titleMap[field]}</h2>
          <button type="button" onClick={onClose} className="icon-btn h-10 w-10" aria-label="닫기">
            <X size={17} />
          </button>
        </div>

        <div className={`flex-1 overscroll-contain px-4 py-4 ${field === 'time' ? 'overflow-hidden pb-2' : 'overflow-y-auto'}`}>
          {field === 'subjectType' && renderOptions('subjectType', courseTypes, (value) => applySimple('subjectType', value))}
          {field === 'grade' && renderOptions('grade', grades, (value) => applySimple('grade', value))}
          {field === 'credits' && renderOptions('credits', creditOptions, (value) => applySimple('credits', value))}
          {field === 'dayOfWeek' && renderOptions('dayOfWeek', filterDaysOfWeek, applyDay)}
          {field === 'time' && (
            filters.dayOfWeek === UNASSIGNED_TIME_FILTER ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
                시간 미지정 과목만 보는 중에는 시간을 고를 수 없어요.
              </p>
            ) : (
              <div className="flex h-full flex-col">
                <p className="mb-2 text-xs leading-5 text-slate-500">
                  선택한 시간 안에 모든 수업이 들어오는 과목만 검색합니다.
                  요일 혹은 시간을 누르면 일괄 선택할 수 있습니다.
                </p>
                <div className="flex-1 overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <div
                    className="grid h-full"
                    style={{
                      gridTemplateColumns: '2.25rem repeat(6, minmax(0, 1fr))',
                      gridTemplateRows: `2.25rem repeat(${TIME_PICKER_HOURS.length}, minmax(0, 1fr))`,
                    }}
                  >
                    <div className="bg-slate-50" aria-hidden="true"></div>
                    {TIME_PICKER_DAYS.map(day => (
                      <button
                        key={`day-${day}`}
                        type="button"
                        aria-label={`${day}요일 전체 선택`}
                        onClick={() => toggleWholeDay(day)}
                        className="border-l border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-600"
                      >
                        {day}
                      </button>
                    ))}
                    {TIME_PICKER_HOURS.map(hour => (
                      <React.Fragment key={`row-${hour}`}>
                        {/* 숫자를 행 상단 경계선에 붙여 "12 = 12시가 시작되는 선"으로 읽히게 한다(중앙 배치는 경계 오인 유발) */}
                        <button
                          type="button"
                          aria-label={`${hour}시 전체 선택`}
                          onClick={() => toggleWholeHour(hour)}
                          className="flex items-start justify-center border-t border-slate-100 bg-slate-50 pt-0.5 text-[11px] leading-none tabular-nums text-slate-400"
                        >
                          {hour}
                        </button>
                        {TIME_PICKER_DAYS.map(day => {
                          const selected = isHourSelected(day, hour);
                          return (
                            <button
                              key={`${day}-${hour}`}
                              type="button"
                              aria-label={`${day} ${hour}시`}
                              aria-pressed={selected}
                              onClick={() => toggleHourCell(day, hour)}
                              className={`border-l border-t border-slate-100 transition-colors ${
                                selected ? 'bg-blue-500' : 'bg-white'
                              }`}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {field === 'time' && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            {/* 백엔드는 요일당 구간 1개만 받으므로 떨어진 칸은 병합 적용된다 — 재오픈 시 "안 누른 칸이 켜짐" 오해 방지용 사전 안내 */}
            {(() => {
              const merged = Object.entries(draftBlocks)
                .filter(([, hours]) => hours.length > 1 && Math.max(...hours) - Math.min(...hours) + 1 !== hours.length)
                .map(([day, hours]) => `${day} ${Math.min(...hours)}~${Math.max(...hours) + 1}시`);
              return merged.length > 0 ? (
                <p className="mb-2 text-[11px] leading-4 text-amber-600">
                  떨어진 칸은 사이 시간을 포함해 {merged.join(' · ')} 구간으로 적용돼요.
                </p>
              ) : null;
            })()}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraftBlocks({})}
                className="btn-secondary h-11 px-3 text-[13px]"
                disabled={Object.keys(draftBlocks).length === 0}
              >
                <RotateCcw size={13} /> 초기화
              </button>
              <button type="button" onClick={applyTimeDraft} className="btn-primary h-11 flex-1 text-[13px]">
                적용하고 닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSingleFilterSheet;
