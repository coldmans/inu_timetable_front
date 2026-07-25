import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useCloseOnDesktop from '../hooks/useCloseOnDesktop';
import useFocusTrap from '../hooks/useFocusTrap';

export const SEARCH_FIELD_LABELS = {
  subjectName: '과목명',
  professor: '교수명',
  courseCode: '과목코드',
};

const RECENT_SEARCH_KEY = 'inu_recent_searches';

const loadRecentSearches = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(entry => entry && typeof entry.term === 'string' && SEARCH_FIELD_LABELS[entry.field])
      : [];
  } catch {
    return [];
  }
};

const persistRecentSearches = (entries) => {
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(entries.slice(0, 10)));
  } catch {
    // 저장 실패(프라이빗 모드 등)는 무시한다.
  }
};

const addRecentSearch = (term, field) => {
  const next = [
    { term, field },
    ...loadRecentSearches().filter(entry => !(entry.term === term && entry.field === field)),
  ];
  persistRecentSearches(next);
  return next.slice(0, 10);
};

// 에타 스타일 모바일 검색 시트: 검색 대상(과목명/교수명/과목코드) 선택 + 최근 검색어.
const MobileSearchSheet = ({ isOpen, onClose, initialTerm, initialField, onApply }) => {
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const [term, setTerm] = useState('');
  const [field, setField] = useState('subjectName');
  const [recentSearches, setRecentSearches] = useState([]);
  useFocusTrap(isOpen, panelRef);
  useBodyScrollLock(isOpen);
  useCloseOnDesktop(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return undefined;
    setTerm(initialTerm);
    setField(SEARCH_FIELD_LABELS[initialField] ? initialField : 'subjectName');
    setRecentSearches(loadRecentSearches());
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, initialTerm, initialField, onClose]);

  if (!isOpen) {
    return null;
  }

  const applySearch = (nextTerm, nextField) => {
    const trimmed = nextTerm.trim();
    if (trimmed) {
      setRecentSearches(addRecentSearch(trimmed, nextField));
    }
    onApply(trimmed, nextField);
    onClose();
  };

  const removeRecent = (target) => {
    const next = recentSearches.filter(entry => !(entry.term === target.term && entry.field === target.field));
    setRecentSearches(next);
    persistRecentSearches(next);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    persistRecentSearches([]);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white md:hidden" role="dialog" aria-modal="true" aria-label="과목 검색어 입력">
      <div ref={panelRef} tabIndex={-1} className="flex h-[100dvh] flex-col focus:outline-none">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              ref={inputRef}
              type="text"
              value={term}
              aria-label="검색어"
              placeholder={`${SEARCH_FIELD_LABELS[field]}으로 검색`}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  // 시트가 닫히며 포커스가 '검색어' 칩으로 복원될 때 같은 Enter 가
                  // 칩을 재활성화해 시트가 다시 열리는 것을 막는다.
                  event.preventDefault();
                  applySearch(term, field);
                }
              }}
              className="field h-11 pl-9 pr-9"
            />
            {term && (
              <button
                type="button"
                onClick={() => { setTerm(''); inputRef.current?.focus(); }}
                aria-label="검색어 지우기"
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost h-11 flex-shrink-0 px-2.5 text-sm">
            취소
          </button>
        </div>

        <div className="flex gap-1.5 px-4 py-3">
          {Object.entries(SEARCH_FIELD_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={field === key}
              onClick={() => { setField(key); inputRef.current?.focus(); }}
              className={`h-9 rounded-full px-3 text-[13px] ring-1 ring-inset transition-colors ${
                field === key
                  ? 'bg-blue-50 font-semibold text-blue-700 ring-blue-200'
                  : 'bg-white font-medium text-slate-600 ring-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          {recentSearches.length > 0 ? (
            <>
              <div className="flex items-center justify-between py-2">
                <p className="text-xs font-semibold text-slate-500">최근 검색어</p>
                <button type="button" onClick={clearRecent} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                  전체 삭제
                </button>
              </div>
              <ul>
                {recentSearches.map(entry => (
                  <li key={`${entry.field}:${entry.term}`} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applySearch(entry.term, entry.field)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2.5 pr-1 text-left"
                    >
                      <span className="min-w-0 truncate text-[15px] text-slate-800">{entry.term}</span>
                      <span className="flex-shrink-0 text-xs text-slate-400">{SEARCH_FIELD_LABELS[entry.field]}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(entry)}
                      aria-label={`${entry.term} 최근 검색어 삭제`}
                      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-slate-300 hover:text-slate-500"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">최근 검색어가 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSearchSheet;
