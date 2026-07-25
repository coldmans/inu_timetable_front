import { useEffect, useRef } from 'react';
import { RotateCcw, X } from 'lucide-react';
import DepartmentFilterButton from './DepartmentFilterButton';
import FilterSelect from './FilterSelect';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useCloseOnDesktop from '../hooks/useCloseOnDesktop';
import useFocusTrap from '../hooks/useFocusTrap';
import { UNASSIGNED_TIME_FILTER, courseTypes, creditOptions, filterDaysOfWeek, grades, timeOptions } from '../utils/timetableUtils';

const MobileFilterSheet = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  activeFilterCount,
  onReset,
  majorShortcuts
}) => {
  const panelRef = useRef(null);
  useFocusTrap(isOpen, panelRef);
  useBodyScrollLock(isOpen);
  useCloseOnDesktop(isOpen, onClose);
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateDayFilter = (value) => {
    setFilters(prev => ({
      ...prev,
      dayOfWeek: value,
      startTime: value === UNASSIGNED_TIME_FILTER ? '전체' : prev.startTime,
      endTime: value === UNASSIGNED_TIME_FILTER ? '전체' : prev.endTime
    }));
  };

  const resetFilters = () => {
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
      <div ref={panelRef} tabIndex={-1} className="modal-panel flex max-h-[86svh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id="mobile-filter-title" className="text-base font-bold text-slate-900">상세 필터</h2>
            <p className="mt-0.5 text-xs text-slate-500">{activeFilterCount > 0 ? `${activeFilterCount}개 적용 중` : '전체 과목'}</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-10 w-10" aria-label="상세 필터 닫기">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3">
          <DepartmentFilterButton
            value={filters.department}
            majorShortcuts={majorShortcuts}
            onChange={(event) => updateFilter('department', event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <FilterSelect
              label="이수구분 필터"
              value={filters.subjectType}
              active={filters.subjectType !== '전체'}
              onChange={(event) => updateFilter('subjectType', event.target.value)}
            >
              {courseTypes.map(type => (
                <option key={type} value={type}>{type === '전체' ? '구분' : type}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="학년 필터"
              value={filters.grade}
              active={filters.grade !== '전체'}
              onChange={(event) => updateFilter('grade', event.target.value)}
            >
              {grades.map(grade => (
                <option key={grade} value={grade}>{grade === '전체' ? '학년' : grade}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="학점 필터"
              value={filters.credits}
              active={filters.credits !== '전체'}
              onChange={(event) => updateFilter('credits', event.target.value)}
            >
              {creditOptions.map(credit => (
                <option key={credit} value={credit}>{credit === '전체' ? '학점' : credit}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="요일 필터"
              value={filters.dayOfWeek}
              active={filters.dayOfWeek !== '전체'}
              onChange={(event) => updateDayFilter(event.target.value)}
            >
              {filterDaysOfWeek.map(day => (
                <option key={day} value={day}>{day === '전체' ? '요일' : day}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="시작 교시 필터"
              value={filters.startTime}
              active={filters.startTime !== '전체'}
              disabled={filters.dayOfWeek === UNASSIGNED_TIME_FILTER}
              onChange={(event) => updateFilter('startTime', event.target.value)}
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time === '전체' ? '시작' : `${time}교시`}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="종료 교시 필터"
              value={filters.endTime}
              active={filters.endTime !== '전체'}
              disabled={filters.dayOfWeek === UNASSIGNED_TIME_FILTER}
              onChange={(event) => updateFilter('endTime', event.target.value)}
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time === '전체' ? '종료' : `${time}교시`}</option>
              ))}
            </FilterSelect>
          </div>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <button type="button" onClick={resetFilters} className="btn-secondary h-11 px-3 text-[13px]" disabled={activeFilterCount === 0}>
            <RotateCcw size={13} /> 초기화
          </button>
          <button type="button" onClick={onClose} className="btn-primary h-11 text-[13px]">
            적용하고 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

// 모바일 필터 칩을 누르면 해당 필터만 바로 선택할 수 있는 단일 필터 시트.
export default MobileFilterSheet;
