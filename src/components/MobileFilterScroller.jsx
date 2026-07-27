import { Filter, X } from 'lucide-react';
import { SEARCH_FIELD_LABELS } from './MobileSearchSheet';
import { getDepartmentFilterSelection } from '../utils/timetableUtils';

const getCompactFilterLabel = (filterKey, value, departmentGroups) => {
  if (filterKey === 'department') {
    if (value === '전체') return '전체';
    const selection = getDepartmentFilterSelection(value, departmentGroups);
    return selection.type === 'group' ? selection.group?.label || value : selection.department || value;
  }

  return value === '전체' ? '전체' : value;
};

const MobileFilterScroller = ({
  filters,
  searchTerm,
  searchField,
  activeFilterCount,
  onOpenFilters,
  onReset,
  onOpenSearch,
  onSelectField,
  onClearField,
  onClearSearch,
  departmentGroups
}) => {
  const timeBlockEntries = Object.entries(filters.timeBlocks || {});
  const timeLabel = timeBlockEntries.length > 0
    ? (() => {
      const parts = timeBlockEntries.map(([day, [startHour, endHour]]) => `${day} ${startHour}~${endHour}`);
      return parts.length > 2 ? `${parts.slice(0, 2).join(' · ')} 외 ${parts.length - 2}` : parts.join(' · ');
    })()
    : (filters.startTime !== '전체' || filters.endTime !== '전체'
      ? `${filters.startTime === '전체' ? '시작' : `${filters.startTime}교시`} - ${filters.endTime === '전체' ? '종료' : `${filters.endTime}교시`}`
      : '전체');
  const chips = [
    {
      key: 'department',
      label: '학과',
      value: getCompactFilterLabel('department', filters.department, departmentGroups),
      active: filters.department !== '전체',
      onClick: () => onSelectField('department'),
      onClear: () => onClearField('department')
    },
    {
      key: 'search',
      label: '검색어',
      value: searchTerm.trim()
        ? (searchField === 'subjectName' ? searchTerm.trim() : `${SEARCH_FIELD_LABELS[searchField]} ${searchTerm.trim()}`)
        : '없음',
      active: Boolean(searchTerm.trim()),
      onClick: onOpenSearch,
      onClear: onClearSearch
    },
    {
      key: 'subjectType',
      label: '구분',
      value: getCompactFilterLabel('subjectType', filters.subjectType),
      active: filters.subjectType !== '전체',
      onClick: () => onSelectField('subjectType'),
      onClear: () => onClearField('subjectType')
    },
    {
      key: 'grade',
      label: '학년',
      value: getCompactFilterLabel('grade', filters.grade),
      active: filters.grade !== '전체',
      onClick: () => onSelectField('grade'),
      onClear: () => onClearField('grade')
    },
    {
      key: 'credits',
      label: '학점',
      value: getCompactFilterLabel('credits', filters.credits),
      active: filters.credits !== '전체',
      onClick: () => onSelectField('credits'),
      onClear: () => onClearField('credits')
    },
    {
      key: 'dayOfWeek',
      label: '요일',
      value: getCompactFilterLabel('dayOfWeek', filters.dayOfWeek),
      active: filters.dayOfWeek !== '전체',
      onClick: () => onSelectField('dayOfWeek'),
      onClear: () => onClearField('dayOfWeek')
    },
    {
      key: 'time',
      label: '시간',
      value: timeLabel,
      active: timeBlockEntries.length > 0 || filters.startTime !== '전체' || filters.endTime !== '전체',
      onClick: () => onSelectField('time'),
      onClear: () => onClearField('time')
    }
  ];

  return (
    <div className="-mx-4 md:hidden">
      {/* 세로 py-2: 칩의 ::after 히트 확장 영역이 overflow 컨테이너에 잘리지 않도록 패딩 안에 수용 */}
      <div
        aria-label="모바일 필터"
        className="flex gap-1 overflow-x-auto overscroll-x-contain px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map(chip => (
          chip.active ? (
            <div key={chip.key} className="flex flex-shrink-0 items-stretch">
              <button
                type="button"
                onClick={chip.onClick}
                className="relative inline-flex h-8 items-center gap-1 rounded-l-full bg-blue-50 pl-2.5 pr-1.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                <span className="text-blue-600/80">{chip.label}</span>
                <span className="max-w-[7.5rem] truncate">{chip.value}</span>
              </button>
              <button
                type="button"
                onClick={chip.onClear}
                aria-label={`${chip.label} 필터 해제`}
                className="relative inline-flex h-8 items-center rounded-r-full border-l border-blue-200/70 bg-blue-50 pl-1 pr-2 text-blue-500 ring-1 ring-inset ring-blue-200 transition-colors after:absolute after:-inset-y-2 after:left-0 after:-right-1 after:content-[''] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClick}
              className="relative inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-full bg-slate-100/80 px-2.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              <span className="text-slate-500">{chip.label}</span>
              <span className="max-w-[7.5rem] truncate">{chip.value}</span>
            </button>
          )
        ))}
        {(activeFilterCount > 0 || searchTerm) && (
          <button
            type="button"
            onClick={onReset}
            className="relative inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 text-[11px] font-semibold text-white after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            <X size={12} /> 초기화
          </button>
        )}
        <button
          type="button"
          onClick={onOpenFilters}
          className="relative inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <Filter size={12} /> 상세
          {activeFilterCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileFilterScroller;
