import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useFocusTrap from '../hooks/useFocusTrap';
import { departmentGroups as fallbackDepartmentGroups, getDepartmentFilterSelection } from '../utils/timetableUtils';

const DepartmentFilterButton = ({
  value,
  onChange,
  departmentGroups = fallbackDepartmentGroups,
  majorShortcuts = [],
  defaultOpen = false,
  onClose,
  hideTrigger = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelRef = useRef(null);
  useFocusTrap(isOpen, panelRef);
  useBodyScrollLock(isOpen);
  const [query, setQuery] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set(['group:정보기술대학']));
  const selection = getDepartmentFilterSelection(value, departmentGroups);
  const active = value !== '전체';
  const selectedGroup = useMemo(
    () => departmentGroups.find(group => group.id === value || group.departments.includes(value)),
    [departmentGroups, value]
  );
  const normalizedQuery = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => (
    departmentGroups
      .map(group => {
        const groupMatches = group.label.toLowerCase().includes(normalizedQuery);
        const visibleDepartments = !normalizedQuery || groupMatches
          ? group.departments
          : group.departments.filter(department => department.toLowerCase().includes(normalizedQuery));

        return {
          ...group,
          departments: visibleDepartments,
          groupMatches
        };
      })
      .filter(group => !normalizedQuery || group.groupMatches || group.departments.length > 0)
  ), [departmentGroups, normalizedQuery]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (selectedGroup) {
      setExpandedGroupIds(prev => {
        const next = new Set(prev);
        next.add(selectedGroup.id);
        return next;
      });
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedGroup, onClose]);

  const requestClose = () => {
    setIsOpen(false);
    setQuery('');
    onClose?.();
  };

  const handleSelect = (nextValue) => {
    onChange({ target: { value: nextValue } });
    requestClose();
  };

  const toggleGroup = (groupId) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          data-testid="department-filter-trigger"
          aria-label="학과/전공 필터"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
          className={`field select-trigger ${active ? 'select-trigger-active' : 'text-slate-600'}`}
        >
          <span className="truncate">{selection.label}</span>
          <ChevronDown size={14} className={`ml-2 flex-shrink-0 ${active ? 'text-blue-500' : 'text-slate-400'}`} />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            data-testid="department-filter-modal"
            aria-modal="true"
            aria-labelledby="department-filter-title"
            className="modal-panel flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:h-auto sm:max-h-[82dvh] sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={requestClose}
                className="-ml-1.5 inline-flex h-9 items-center gap-1 rounded-lg pl-1 pr-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="학과/전공 창 닫기"
              >
                <ChevronLeft size={18} /> 뒤로
              </button>
              <h2 id="department-filter-title" className="text-base font-bold tracking-tight text-slate-900">학과/전공</h2>
              <button type="button" onClick={requestClose} className="icon-btn h-9 w-9" aria-label="학과/전공 창 닫기">
                <X size={17} />
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="학과/전공 검색"
                  className="field h-10 pl-9"
                />
              </div>
              <button
                type="button"
                data-testid="department-filter-all"
                onClick={() => handleSelect('전체')}
                className={`mt-2.5 flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm transition-colors ${value === '전체' ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-blue-100' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                <span>전체</span>
                {value === '전체' && <CheckCircle2 size={15} className="text-blue-500" />}
              </button>
              {majorShortcuts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {majorShortcuts.map(shortcut => (
                    <button
                      key={`${shortcut.type}-${shortcut.department}`}
                      type="button"
                      onClick={() => handleSelect(shortcut.department)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${value === shortcut.department ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                    >
                      {shortcut.label} · {shortcut.department}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4">
              {visibleGroups.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-slate-500">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleGroups.map(group => {
                    const isExpanded = Boolean(normalizedQuery) || expandedGroupIds.has(group.id);
                    const isGroupSelected = value === group.id;

                    return (
                      <div key={group.id} className="py-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown size={15} className="flex-shrink-0 text-slate-400" />
                            ) : (
                              <ChevronRight size={15} className="flex-shrink-0 text-slate-400" />
                            )}
                            <span className="truncate">{group.label}</span>
                          </button>
                          <button
                            type="button"
                            data-testid="department-group-select"
                            data-department-group={group.label}
                            onClick={() => handleSelect(group.id)}
                            className={`h-8 flex-shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-colors ${isGroupSelected ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                          >
                            전체
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="ml-7 border-l border-slate-100 pl-2">
                            {group.departments.map(department => {
                              const isSelected = value === department;

                              return (
                                <button
                                  key={department}
                                  type="button"
                                  data-testid="department-option"
                                  data-department={department}
                                  onClick={() => handleSelect(department)}
                                  className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                  <span className="break-keep leading-snug">{department}</span>
                                  {isSelected && <CheckCircle2 size={15} className="flex-shrink-0 text-blue-500" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DepartmentFilterButton;
