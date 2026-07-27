import React, { useMemo } from 'react';
import { AlertTriangle, ChevronDown, Clock, MessageSquare, Plus, RotateCcw, SearchX, ShoppingCart } from 'lucide-react';
import { getNoScheduleLabel, parseTime, parseTimeString } from '../utils/timetableUtils';

const formatPeriod = (value) => {
  const rounded = Math.round(value * 2) / 2;
  if (rounded >= 10) return `야${rounded - 9}`;
  return `${rounded}`;
};

const formatScheduleLabel = (course) => {
  const times = course.schedules ? parseTime(course.schedules) : parseTimeString(course.time);
  if (!times || times.length === 0) {
    return course.time ? course.time : getNoScheduleLabel(course.classMethod);
  }
  return times.map(t => `${t.day} ${formatPeriod(t.start)}~${formatPeriod(t.end)}교시`).join(' · ');
};

const extractWishlistCount = (course) => {
  const countKeys = [
    'timetableAddCount',
    'timetable_add_count',
    'addCount',
    'add_count',
    'timetableCount',
    'timetable_count',
    'wishlistCount',
    'wishlist_count',
    'savedCount',
    'saved_count',
    'wishCount',
    'wish_count',
    'wishlistItemCount'
  ];

  for (const key of countKeys) {
    if (course[key] === undefined || course[key] === null) continue;

    const count = Number(course[key]);
    if (Number.isFinite(count)) {
      return Math.max(0, count);
    }
  }

  return null;
};

const getWishlistCountPreview = (course) => {
  const source = `${course.id ?? ''}:${course.name ?? ''}:${course.department ?? ''}`;
  let hash = 17;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 9973;
  }

  return 4 + (hash % 136);
};

const getCourseWishlistCount = (course, allowPreview = false) => {
  const realCount = extractWishlistCount(course);
  if (realCount !== null) return realCount;
  if (!allowPreview) return 0;

  return getWishlistCountPreview(course);
};

const formatWishlistCountLabel = (count) => {
  if (count >= 1000) {
    return `${(Math.floor(count / 100) / 10).toLocaleString()}천명 추가`;
  }

  return `${count.toLocaleString()}명 추가`;
};

const WishlistCountChip = ({ count, variant = 'meta', className = '' }) => {
  if (!count || count <= 0) return null;

  if (variant === 'action') {
    return (
      <span className={`inline-flex h-7 items-center gap-1 rounded-lg bg-blue-50 px-2 text-[11px] font-semibold tabular-nums text-blue-700 ring-1 ring-inset ring-blue-100 ${className}`}>
        <ShoppingCart size={12} className="text-blue-500" />
        {formatWishlistCountLabel(count)}
      </span>
    );
  }

  return (
    <span className={`meta-chip flex-shrink-0 bg-blue-50 text-blue-700 ring-blue-100 ${className}`}>
      <ShoppingCart size={11} className="text-blue-500" />
      {formatWishlistCountLabel(count)}
    </span>
  );
};

const getClassMethodLabel = (classMethod) => {
  if (classMethod === 'ONLINE') return '온라인';
  if (classMethod === 'OFFLINE') return '오프라인';
  if (classMethod === 'HYBRID' || classMethod === 'BLENDED') return '혼합';
  return classMethod || null;
};

// 검색 입력마다 목록 전체(무한 스크롤로 100행 이상)가 재렌더되지 않도록 memo 처리한다.
// 부모는 props(핸들러 포함)의 참조가 안정적이도록 유지해야 한다.
export const CourseRow = React.memo(({
  course,
  onAddToTimetable,
  onAddToWishlist,
  actionsDisabled = false,
  showWishlistCountPreview = false,
  isExpanded = false,
  onToggleExpanded = () => {}
}) => {
  const wishlistCount = getCourseWishlistCount(course, showWishlistCountPreview);
  const courseReviewUrl = `https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`;
  const classMethodLabel = getClassMethodLabel(course.classMethod);
  const courseCode = course.code || course.subjectCode || course.courseCode || course.courseNo;
  const scheduleLabel = useMemo(() => formatScheduleLabel(course), [course]);
  // 펼침 영역에는 접힌 행에 없는 정보만 보여준다(구분·학점은 요약 행과 중복이라 제외).
  const detailItems = [
    course.grade ? `${course.grade}학년` : '전학년',
    courseCode
  ].filter(Boolean);
  const handleSummaryClick = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
      return;
    }
    onToggleExpanded(course.id);
  };

  return (
    <li className={`course-list-row ${isExpanded ? 'bg-blue-50/45' : ''}`}>
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <button
          type="button"
          data-testid="course-row-summary"
          onClick={handleSummaryClick}
          aria-expanded={isExpanded}
          className="w-full min-w-0 flex-1 text-left focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:cursor-default"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`course-type-badge ${course.color} ${course.textColor}`}>
              {course.type}
            </span>
            <span className="min-w-0 truncate text-[15px] font-semibold text-slate-900" title={course.name}>
              {course.name}
            </span>
            <span className="meta-chip flex-shrink-0">{course.credits}학점</span>
            <WishlistCountChip count={wishlistCount} className="sm:hidden" />
            {/* 모바일에서 탭하면 펼쳐진다는 힌트 (데스크톱은 버튼이 항상 노출되므로 불필요) */}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`ml-auto flex-shrink-0 text-slate-400 transition-transform sm:hidden ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="min-w-0 flex-shrink-[2] truncate">
              {course.professor} · {course.department}
            </span>
            <span className="meta-chip min-w-0 flex-shrink bg-white">
              <Clock size={11} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{scheduleLabel}</span>
            </span>
          </div>
        </button>

        <div className="hidden sm:ml-3 sm:block sm:flex-shrink-0">
          <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-1 sm:flex sm:justify-end sm:gap-1.5">
            {wishlistCount > 0 && (
              <div className="col-span-3 flex justify-end sm:col-span-1">
                <WishlistCountChip count={wishlistCount} variant="action" className="hidden sm:inline-flex" />
              </div>
            )}
            <a
              data-tour="course-review"
              href={courseReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${course.name} 강의평 보기`}
              title="에브리타임 강의평"
              className="icon-btn h-10 w-10 bg-slate-50/80 ring-1 ring-inset ring-slate-200/70 fine:h-8 fine:w-8"
            >
              <MessageSquare size={15} />
            </a>
            <button
              data-tour="course-wishlist"
              type="button"
              onClick={() => onAddToWishlist(course)}
              disabled={actionsDisabled}
              className="btn-secondary h-10 flex-1 px-3 text-[13px] fine:h-8 sm:flex-none"
            >
              <ShoppingCart size={13} /> 담기
            </button>
            <button
              data-tour="course-add"
              type="button"
              onClick={() => onAddToTimetable(course)}
              disabled={actionsDisabled}
              className="btn-primary h-10 flex-1 px-3 text-[13px] fine:h-8 sm:flex-none"
            >
              <Plus size={13} /> 추가
            </button>
          </div>
        </div>

        {isExpanded && (
          <div data-testid="course-row-actions" className="sm:hidden">
            {(detailItems.length > 0 || classMethodLabel) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                {detailItems.map(item => (
                  <span key={item}>{item}</span>
                ))}
                {classMethodLabel && (
                  <span className="font-medium text-blue-600">{classMethodLabel}</span>
                )}
              </div>
            )}
            {(course.note || course.description) && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {course.note || course.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-1.5">
              <button
                data-tour="course-add"
                type="button"
                onClick={() => onAddToTimetable(course)}
                disabled={actionsDisabled}
                className="btn-primary h-10 px-3 text-xs fine:h-9"
              >
                <Plus size={13} /> 시간표에 추가
              </button>
              <a
                data-tour="course-review"
                href={courseReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${course.name} 강의평 보기`}
                className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors fine:h-9 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <MessageSquare size={13} /> 강의평
              </a>
              <button
                data-tour="course-wishlist"
                type="button"
                onClick={() => onAddToWishlist(course)}
                disabled={actionsDisabled}
                className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors fine:h-9 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                <ShoppingCart size={13} /> 담기
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
});

CourseRow.displayName = 'CourseRow';

export const CourseRowSkeleton = () => (
  <li className="course-list-row animate-pulse">
    <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-5 w-9 rounded-md bg-slate-100" />
          <div className="h-5 w-44 rounded-md bg-slate-200" />
          <div className="h-5 w-10 rounded-md bg-slate-100" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <div className="h-5 w-24 rounded-md bg-slate-100 sm:w-36" />
          <div className="h-5 w-32 rounded-md bg-slate-100 sm:w-48" />
        </div>
      </div>
      <div className="grid grid-cols-[2.75rem_1fr_1fr] gap-1.5 sm:flex">
        <div className="h-11 rounded-lg bg-slate-100 sm:h-8 sm:w-8" />
        <div className="h-11 rounded-lg bg-slate-100 sm:h-8 sm:w-14" />
        <div className="h-11 rounded-lg bg-slate-200 sm:h-8 sm:w-14" />
      </div>
    </div>
  </li>
);

export const EmptyResults = ({ onReset }) => (
  <div className="flex flex-col items-center px-6 py-16 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
      <SearchX size={22} />
    </div>
    <p className="mt-4 text-[15px] font-semibold text-slate-900">조건에 맞는 과목이 없어요</p>
    <p className="mt-1 text-sm text-slate-500">검색어를 바꾸거나 필터를 초기화해 보세요.</p>
    <button type="button" onClick={onReset} className="btn-secondary mt-5">
      <RotateCcw size={14} /> 필터 초기화
    </button>
  </div>
);

export const ErrorResults = ({ onRetry }) => (
  <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500">
      <AlertTriangle size={22} />
    </div>
    <p className="mt-4 text-[15px] font-semibold text-slate-900">과목 정보를 불러오지 못했어요</p>
    <p className="mt-1 text-sm text-slate-500">잠시 후 다시 시도해 주세요.</p>
    <button type="button" onClick={onRetry} className="btn-secondary mt-5">
      <RotateCcw size={14} /> 다시 시도
    </button>
  </div>
);

