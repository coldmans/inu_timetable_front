import React, { useState, useMemo, useEffect, useRef, useCallback, useId } from 'react';
import { Search, Filter, Plus, Info, ChevronDown, ChevronLeft, ChevronRight, MapPin, Clock, Star, X, ShoppingCart, CalendarDays, AlertTriangle, LogIn, LogOut, Download, Maximize, MessageSquare, CheckCircle2, XCircle, RotateCcw, SearchX, Trash2, UserCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal, { AuthSelect } from './components/AuthModal';
import Pagination from './components/Pagination';
import TimetableCombinationResults from './components/TimetableCombinationResults';
import WishlistModal from './components/WishlistModal';
import CourseDetailModal from './components/CourseDetailModal';
import TimetableCourseMenu from './components/TimetableCourseMenu';
import TimetableListModal from './components/TimetableListModal';
import TimetableExportView from './components/TimetableExportView';
import useBodyScrollLock from './hooks/useBodyScrollLock';
import useFocusTrap from './hooks/useFocusTrap';
import useModalDismiss from './hooks/useModalDismiss';

import { subjectAPI, wishlistAPI, timetableAPI, combinationAPI } from './services/api';
// html2canvas는 이미지 저장 시점에 동적 import 한다(초기 번들에서 제외).
import TimetableGrid from './components/TimetableGrid';
import {
  CURRENT_SEMESTER,
  formatCourse,
  getCourseTypeColorScheme,
  parseTime,
  parseTimeString,
  checkConflict,
  departmentGroups,
  getDepartmentFilterParams,
  getDepartmentFilterSelection,
  courseTypes,
  grades,
  filterDaysOfWeek,
  UNASSIGNED_TIME_FILTER,
  timeOptions,
  creditOptions
} from './utils/timetableUtils';


// Helpers and Constants moved to utils/timetableUtils.js

// More constants moved to utils/timetableUtils.js


const portalRegisteredCourses = [
  {
    grade: '전체',
    type: '핵심교양',
    courseNo: '0011229001',
    courseTitle: 'MBTI로찾아가는나의해법 [7브수업]',
    courseTitleEn: 'My Book that Goes Back to MBTI',
    credit: 3,
    english: '-',
    time: '수 1-2A 2B-3 (12-301)',
    department: '교양',
    professor: '박상원',
    status: '마감'
  },
  {
    grade: '3',
    type: '전공심화',
    courseNo: '0006836001',
    courseTitle: '네트워크구조설계 [7브수업]',
    courseTitleEn: 'Network Architecture and Design',
    credit: 3,
    english: '-',
    time: '월 2B-3 (07-311) 수 7-8A (07-311)',
    department: '임베디드시스템공학과',
    professor: '황광명',
    status: '신청'
  },
  {
    grade: '4',
    type: '전공심화',
    courseNo: 'IAC3058001',
    courseTitle: '캡스톤디자인(2) [7브수업]',
    courseTitleEn: 'CAPSTONE DESIGN(2)',
    credit: 3,
    english: '-',
    time: '수 8B-9 (07-302) 목 9-9B (07-302)',
    department: '임베디드시스템공학과',
    professor: '전경구',
    status: '신청'
  },
  {
    grade: '3',
    type: '전공심화',
    courseNo: '0001770001',
    courseTitle: '데이터베이스 [7브수업]',
    courseTitleEn: 'Database',
    credit: 3,
    english: '-',
    time: '월 8B-9 (07-311) 수 2B-3 (07-311)',
    department: '임베디드시스템공학과',
    professor: '강우천',
    status: '신청'
  },
  {
    grade: '2',
    type: '전공필수',
    courseNo: '0001765002',
    courseTitle: 'C++언어',
    courseTitleEn: 'C++ Language',
    credit: 2,
    english: '-',
    time: '월 5 6 7 (07-511)',
    department: '컴퓨터공학부',
    professor: '전혜경',
    status: '신청'
  },
  {
    grade: '2',
    type: '부전공',
    courseNo: '0001780001',
    courseTitle: '모바일소프트웨어 (온라인혼합강좌)',
    courseTitleEn: 'Mobile Software',
    credit: 3,
    english: '-',
    time: '화 5 6 (07-408) 수 5 6 (07-408)',
    department: '컴퓨터공학부',
    professor: '홍윤식',
    status: '신청'
  },
  {
    grade: '2',
    type: '부전공',
    courseNo: 'IAA6021003',
    courseTitle: '컴퓨터네트워크 (COMPUTER NETWORK)',
    courseTitleEn: 'COMPUTER NETWORK',
    credit: 3,
    english: '-',
    time: '화 2B-3 (07-504) 목 5B-6 (07-504)',
    department: '컴퓨터공학부',
    professor: '최승식',
    status: '신청'
  },
];

// --- UI Components ---

const toastIcons = {
  success: <CheckCircle2 size={17} className="flex-shrink-0 text-emerald-500" />,
  warning: <AlertTriangle size={17} className="flex-shrink-0 text-amber-500" />,
  error: <XCircle size={17} className="flex-shrink-0 text-rose-500" />,
  info: <Info size={17} className="flex-shrink-0 text-blue-500" />,
};

const Toast = ({ message, show, type, onDismiss }) => (
  <div
    role="status"
    aria-live="polite"
    className={`fixed left-1/2 top-4 z-[60] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-xl bg-white py-2.5 pl-3.5 pr-2 shadow-lg ring-1 ring-slate-900/10 transition-all duration-200 ease-out ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}
  >
    {toastIcons[type] || toastIcons.info}
    <span className="text-sm font-medium text-slate-800">{message}</span>
    <button onClick={onDismiss} aria-label="알림 닫기" className="icon-btn h-7 w-7">
      <X size={14} />
    </button>
  </div>
);

const LoadingOverlay = ({ isGenerating }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) return undefined;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30); // 3초 동안 100% 채우기

    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="modal-panel flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-7 shadow-xl ring-1 ring-slate-200">
        <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" aria-hidden="true"></div>
        <div className="text-center">
          <p className="text-gray-900 text-lg font-semibold">시간표 조합을 준비하고 있어요</p>
          <p className="text-sm text-gray-500">잠시만 기다려 주세요</p>
        </div>
        <div className="w-52 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-xs font-medium text-gray-500">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

const tutorialSteps = [
  {
    element: '[data-tour="course-search"]',
    popover: {
      title: '먼저 과목을 좁혀요',
      description: '과목명으로 찾고, 학과·구분·요일 필터로 이번 학기에 볼 강의를 빠르게 줄일 수 있어요.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="course-review"]',
    popover: {
      title: '말풍선은 에타 후기',
      description: '말풍선 버튼을 누르면 해당 과목명으로 에브리타임 강의평 검색이 열려요. 교수님이나 과제 분위기를 확인할 때 쓰면 됩니다.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="course-wishlist"]',
    popover: {
      title: '담기는 후보 보관',
      description: '아직 바로 넣을지 애매한 과목은 위시리스트에 담아두세요. 나중에 필수 포함 여부를 정하고 조합을 만들 수 있어요.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="course-add"]',
    popover: {
      title: '추가는 바로 시간표 반영',
      description: '시간이 확정된 과목을 바로 내 시간표에 넣는 버튼이에요. 서버에서 시간 겹침도 한 번 더 확인합니다.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="wishlist-panel"]',
    popover: {
      title: '담은 과목으로 조합 만들기',
      description: '위시리스트에 후보를 모은 뒤 목표 학점과 공강 요일을 정하면 가능한 시간표 조합을 비교할 수 있어요.',
      side: 'left',
      align: 'start'
    }
  }
];

const NewUserTutorial = ({ shouldStart, onFinish }) => {
  useEffect(() => {
    if (!shouldStart) return undefined;

    let timeoutId;
    let tourInstance;
    let attempts = 0;
    let cleanedUp = false;

    const startTour = async () => {
      const hasCourseActionTargets = tutorialSteps
        .filter(step => step.element.includes('course-') && step.element !== '[data-tour="course-search"]')
        .every(step => document.querySelector(step.element));
      const availableSteps = tutorialSteps.filter(step => document.querySelector(step.element));

      if (availableSteps.length === 0) {
        onFinish();
        return;
      }

      if (!hasCourseActionTargets && attempts < 10) {
        attempts += 1;
        timeoutId = window.setTimeout(startTour, 150);
        return;
      }

      let driverFactory;
      try {
        const driverModule = await import('driver.js');
        await import('driver.js/dist/driver.css');
        driverFactory = driverModule.driver;
      } catch (error) {
        console.error('튜토리얼 라이브러리를 불러오지 못했습니다.', error);
        onFinish();
        return;
      }

      if (cleanedUp) return;

      tourInstance = driverFactory({
        animate: true,
        allowClose: true,
        showButtons: ['next', 'previous', 'close'],
        showProgress: true,
        popoverClass: 'inu-tour-popover',
        stagePadding: 8,
        stageRadius: 14,
        overlayOpacity: 0.58,
        nextBtnText: '다음',
        prevBtnText: '이전',
        doneBtnText: '이해했어요',
        progressText: '{{current}}/{{total}}',
        steps: availableSteps,
        onDestroyed: () => {
          if (!cleanedUp) {
            onFinish();
          }
        }
      });

      tourInstance.drive();
    };

    timeoutId = window.setTimeout(startTour, 80);

    return () => {
      cleanedUp = true;
      window.clearTimeout(timeoutId);
      tourInstance?.destroy();
    };
  }, [shouldStart, onFinish]);

  return null;
};

// Timetable components moved to components/TimetableGrid.jsx

const formatPeriod = (value) => {
  const rounded = Math.round(value * 2) / 2;
  if (rounded >= 10) return `야${rounded - 9}`;
  return `${rounded}`;
};

const formatScheduleLabel = (course) => {
  const times = course.schedules ? parseTime(course.schedules) : parseTimeString(course.time);
  if (!times || times.length === 0) {
    return course.time ? course.time : '온라인';
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
  if (classMethod === 'HYBRID') return '혼합';
  return classMethod || null;
};

const CourseRow = ({
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
  const detailItems = [
    course.grade ? `${course.grade}학년` : '전학년',
    course.type,
    `${course.credits}학점`,
    courseCode
  ].filter(Boolean);
  const handleSummaryClick = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
      return;
    }
    onToggleExpanded();
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
          </div>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="min-w-0 flex-shrink-[2] truncate">
              {course.professor} · {course.department}
            </span>
            <span className="meta-chip min-w-0 flex-shrink bg-white">
              <Clock size={11} className="flex-shrink-0 text-slate-400" />
              <span className="truncate">{formatScheduleLabel(course)}</span>
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
              className="icon-btn h-10 w-10 bg-slate-50/80 ring-1 ring-inset ring-slate-200/70 sm:h-8 sm:w-8"
            >
              <MessageSquare size={15} />
            </a>
            <button
              data-tour="course-wishlist"
              type="button"
              onClick={() => onAddToWishlist(course)}
              disabled={actionsDisabled}
              className="btn-secondary h-10 flex-1 px-3 text-[13px] sm:h-8 sm:flex-none"
            >
              <ShoppingCart size={13} /> 담기
            </button>
            <button
              data-tour="course-add"
              type="button"
              onClick={() => onAddToTimetable(course)}
              disabled={actionsDisabled}
              className="btn-primary h-10 flex-1 px-3 text-[13px] sm:h-8 sm:flex-none"
            >
              <Plus size={13} /> 추가
            </button>
          </div>
        </div>

        {isExpanded && (
          <div
            data-testid="course-row-actions"
            className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200 sm:hidden"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-slate-600">
              {detailItems.map(item => (
                <span key={item}>{item}</span>
              ))}
              {classMethodLabel && (
                <span className="font-semibold text-blue-600">{classMethodLabel}</span>
              )}
            </div>
            {(course.note || course.description) && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {course.note || course.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button
                data-tour="course-add"
                type="button"
                onClick={() => onAddToTimetable(course)}
                disabled={actionsDisabled}
                className="btn-primary h-10 flex-1 rounded-full px-3 text-xs"
              >
                <Plus size={13} /> 시간표에 추가
              </button>
              <div className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500">
                <a
                  data-tour="course-review"
                  href={courseReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${course.name} 강의평 보기`}
                  className="inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <MessageSquare size={13} /> 강의평
                </a>
                <button
                  data-tour="course-wishlist"
                  type="button"
                  onClick={() => onAddToWishlist(course)}
                  disabled={actionsDisabled}
                  className="inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                >
                  <ShoppingCart size={13} /> 담기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

const CourseRowSkeleton = () => (
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

const EmptyResults = ({ onReset }) => (
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

const getCompactFilterLabel = (filterKey, value) => {
  if (filterKey === 'department') {
    if (value === '전체') return '전체';
    const selection = getDepartmentFilterSelection(value);
    return selection.type === 'group' ? selection.group?.label || value : selection.department || value;
  }

  return value === '전체' ? '전체' : value;
};

const MobileFilterScroller = ({
  filters,
  searchTerm,
  activeFilterCount,
  onOpenFilters,
  onReset,
  onFocusSearch,
  onSelectField
}) => {
  const timeLabel = filters.startTime !== '전체' || filters.endTime !== '전체'
    ? `${filters.startTime === '전체' ? '시작' : `${filters.startTime}교시`} - ${filters.endTime === '전체' ? '종료' : `${filters.endTime}교시`}`
    : '전체';
  const chips = [
    {
      key: 'department',
      label: '학과',
      value: getCompactFilterLabel('department', filters.department),
      active: filters.department !== '전체',
      onClick: () => onSelectField('department')
    },
    {
      key: 'search',
      label: '검색어',
      value: searchTerm.trim() || '없음',
      active: Boolean(searchTerm.trim()),
      onClick: onFocusSearch
    },
    {
      key: 'subjectType',
      label: '구분',
      value: getCompactFilterLabel('subjectType', filters.subjectType),
      active: filters.subjectType !== '전체',
      onClick: () => onSelectField('subjectType')
    },
    {
      key: 'grade',
      label: '학년',
      value: getCompactFilterLabel('grade', filters.grade),
      active: filters.grade !== '전체',
      onClick: () => onSelectField('grade')
    },
    {
      key: 'credits',
      label: '학점',
      value: getCompactFilterLabel('credits', filters.credits),
      active: filters.credits !== '전체',
      onClick: () => onSelectField('credits')
    },
    {
      key: 'dayOfWeek',
      label: '요일',
      value: getCompactFilterLabel('dayOfWeek', filters.dayOfWeek),
      active: filters.dayOfWeek !== '전체',
      onClick: () => onSelectField('dayOfWeek')
    },
    {
      key: 'time',
      label: '시간',
      value: timeLabel,
      active: filters.startTime !== '전체' || filters.endTime !== '전체',
      onClick: () => onSelectField('time')
    }
  ];

  return (
    <div className="-mx-3 mt-2.5 md:hidden">
      <div
        aria-label="모바일 필터"
        className="flex gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onClick}
            className={`inline-flex h-9 flex-shrink-0 items-center gap-1 rounded-full px-2.5 text-xs ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              chip.active
                ? 'bg-blue-50 font-semibold text-blue-700 ring-blue-200'
                : 'bg-slate-100/80 font-medium text-slate-600 ring-slate-200'
            }`}
          >
            <span className={chip.active ? 'text-blue-600/80' : 'text-slate-500'}>{chip.label}</span>
            <span className="max-w-[7.5rem] truncate">{chip.value}</span>
          </button>
        ))}
        {(activeFilterCount > 0 || searchTerm) && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 flex-shrink-0 items-center gap-1 rounded-full bg-slate-900 px-2.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            <X size={12} /> 초기화
          </button>
        )}
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex h-9 flex-shrink-0 items-center gap-1 rounded-full bg-white px-2.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
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

const HiddenPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
    <div className="max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <SearchX size={22} />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        주소가 바뀌었거나 더 이상 제공되지 않는 화면입니다.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        시간표로 돌아가기
      </a>
    </div>
  </div>
);

const developerNoteEntries = [
  {
    date: '2026.06.13',
    title: '서비스 UI와 온라인 과목 정리',
    items: [
      '검색 결과를 한 줄 리스트 중심으로 정리했습니다.',
      '온라인 과목을 필터로 찾을 수 있게 하고 표시 문구를 정리했습니다.',
      '모바일 버튼, 위시리스트, 조합 결과 화면의 사용성을 다듬었습니다.',
      '사이트 footer에서 확인할 수 있는 개발자 노트를 추가했습니다.',
      '회원 탈퇴 시 계정은 익명화하고 누적 이용 통계는 보존하도록 정리했습니다.',
    ],
  },
  {
    date: '2026.06.12',
    title: '로그인과 검색 성능 개선',
    items: [
      '로그인 세션과 개인 시간표 접근 흐름을 정리했습니다.',
      '다음 학기 데이터 교체를 위한 과목 업로드 흐름을 분리했습니다.',
      '과목 검색 속도를 안정적으로 유지하기 위한 캐시와 warm-up 방향을 검증했습니다.',
      '검색 노출을 위해 메타데이터, robots, sitemap 구성을 점검했습니다.',
    ],
  },
  {
    date: '2026.05.22',
    title: '프로젝트 소개 문서 정리',
    items: [
      '서비스 구조와 주요 기능을 설명하는 README를 정리했습니다.',
      '성능 개선, 데이터 파싱, 시간표 조합 기능의 작업 배경을 문서화했습니다.',
    ],
  },
  {
    date: '2026.04.29',
    title: '과목 관리와 공식 데이터 import 준비',
    items: [
      '공식 과목 데이터를 관리할 수 있는 내부 도구를 준비했습니다.',
      '공식 과목 엑셀을 미리보기한 뒤 반영할 수 있는 흐름을 만들었습니다.',
      '중복 과목과 학기별 과목 데이터 충돌을 줄이기 위한 검증을 보강했습니다.',
    ],
  },
  {
    date: '2026.03.31',
    title: '검색 필터와 화면 동작 보강',
    items: [
      '학과, 이수구분, 학점 등 검색 필터 동작을 강화했습니다.',
      '검색 결과와 시간표 화면의 행 표시 방식을 조정했습니다.',
      '불필요한 문의 UI와 자잘한 화면 버그를 정리했습니다.',
    ],
  },
  {
    date: '2026.02.14',
    title: '계정과 학기 데이터 정합성 개선',
    items: [
      '회원 탈퇴 UI와 API 흐름을 연결했습니다.',
      '학기 기준으로 시간표와 위시리스트가 섞이지 않도록 정리했습니다.',
      '비밀번호 저장 방식과 데이터 중복 방지 제약을 보강했습니다.',
    ],
  },
  {
    date: '2026.02.03',
    title: '모바일 시간표와 필터 편의성 개선',
    items: [
      '모바일에서 시간표를 더 쉽게 확인할 수 있도록 화면을 조정했습니다.',
      '야간 과목과 학점 필터 관련 오류를 수정했습니다.',
      '과목 추가 시 중복 클릭으로 생길 수 있는 문제를 줄였습니다.',
    ],
  },
  {
    date: '2026.01.10',
    title: '과목 파싱과 시간표 조합 기반 정리',
    items: [
      'PDF/엑셀에서 가져온 과목 데이터 검증 흐름을 정리했습니다.',
      '공강 요일 조건을 시간표 조합 요청에 반영했습니다.',
      '학과명 줄임말과 과목 데이터 파싱 규칙을 보강했습니다.',
    ],
  },
  {
    date: '2025.08.04',
    title: '시간표 조합 서비스 시작',
    items: [
      '과목 검색, 위시리스트, 시간표 조합 생성의 기본 흐름을 구현했습니다.',
      '백엔드 API와 프론트 화면을 연결해 실제 시간표를 만들 수 있게 했습니다.',
    ],
  },
];

const upcomingDeveloperNotes = [
  '계정 설정 화면 세부 정리',
  '다음 학기 과목 업로드와 학기 전환 기능',
  '인기 과목과 위시리스트 기반 통계',
  '시간표 공유와 이미지 내보내기 개선',
];

const DeveloperNotesModal = ({ onClose }) => {
  const panelRef = useRef(null);
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="developer-notes-title" className="modal-panel max-h-[88vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">서비스 개선 기록</p>
            <h2 id="developer-notes-title" className="mt-1 text-lg font-bold text-slate-900">개발자 노트</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="개발 노트 닫기">
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-4.5rem)] overflow-y-auto px-5 py-4">
          <ol className="space-y-4">
            {developerNoteEntries.map((entry) => (
              <li key={entry.date} className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3">
                <time className="pt-0.5 text-xs font-semibold tabular-nums text-slate-400">{entry.date}</time>
                <div className="border-l border-slate-200 pl-4">
                  <h3 className="text-sm font-bold text-slate-900">{entry.title}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {entry.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">업데이트 예정</h3>
            <ul className="mt-2 space-y-1.5">
              {upcomingDeveloperNotes.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-500">
                  <Info size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterSelect = ({ value, onChange, active, label, disabled = false, optionWrap = false, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const options = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map(child => ({
      value: child.props.value,
      label: child.props.children
    }));
  const selectedIndex = options.findIndex(option => String(option.value) === String(value));
  const selectedOption = options[selectedIndex] || options[0];
  const listboxId = `${selectId}-listbox`;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => {
      optionRefs.current[nextIndex]?.focus();
    });
  }, [isOpen, selectedIndex]);

  const handleSelect = (nextValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (String(nextValue) !== String(value)) {
      onChange({ target: { value: nextValue } });
    }
  };

  const focusOption = (nextIndex) => {
    const normalizedIndex = (nextIndex + options.length) % options.length;
    setActiveIndex(normalizedIndex);
    optionRefs.current[normalizedIndex]?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (event, index, optionValue) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(optionValue);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
          }
        }}
        className={`field select-trigger ${active && !disabled ? 'select-trigger-active' : 'text-slate-600'}`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          size={14}
          className={`ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${active && !disabled ? 'text-blue-500' : 'text-slate-400'}`}
        />
      </button>

      {isOpen && (
        <div className={`select-menu ${optionWrap ? 'select-menu-wide' : ''}`}>
          <div id={listboxId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1">
            {options.map((option, optionIndex) => {
              const isSelected = String(option.value) === String(value);
              const isActive = optionIndex === activeIndex;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[optionIndex] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isActive ? 0 : -1}
                  title={typeof option.label === 'string' ? option.label : undefined}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, optionIndex, option.value)}
                  className={`select-option ${isSelected ? 'select-option-active' : ''}`}
                >
                  <span className={optionWrap ? 'break-keep leading-snug' : 'truncate'}>{option.label}</span>
                  {isSelected && <CheckCircle2 size={14} className="flex-shrink-0 text-blue-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const DepartmentFilterButton = ({ value, onChange, majorShortcuts = [], defaultOpen = false, onClose, hideTrigger = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelRef = useRef(null);
  useFocusTrap(isOpen, panelRef);
  useBodyScrollLock(isOpen);
  const [query, setQuery] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set(['group:정보기술대학']));
  const selection = getDepartmentFilterSelection(value);
  const active = value !== '전체';
  const selectedGroup = useMemo(
    () => departmentGroups.find(group => group.id === value || group.departments.includes(value)),
    [value]
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
  ), [normalizedQuery]);

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
      <div ref={panelRef} tabIndex={-1} className="modal-panel flex max-h-[86vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id="mobile-filter-title" className="text-base font-bold text-slate-900">상세 필터</h2>
            <p className="mt-0.5 text-xs text-slate-500">{activeFilterCount > 0 ? `${activeFilterCount}개 적용 중` : '전체 과목'}</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-10 w-10" aria-label="상세 필터 닫기">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
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
const MobileSingleFilterSheet = ({ field, filters, setFilters, onClose, majorShortcuts }) => {
  const panelRef = useRef(null);
  useFocusTrap(!!field && field !== 'department', panelRef);
  useBodyScrollLock(!!field && field !== 'department');

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
      endTime: value === UNASSIGNED_TIME_FILTER ? '전체' : prev.endTime
    }));
    onClose();
  };

  const renderOptions = (key, options, onPick) => (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => {
        const selected = String(filters[key]) === String(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className={`h-11 rounded-xl px-3 text-sm transition-colors ${
              selected
                ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-inset ring-blue-200'
                : 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {opt === '전체' ? '전체' : opt}
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
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm md:hidden" role="dialog" aria-modal="true" aria-label={`${titleMap[field]} 필터`}>
      <div ref={panelRef} tabIndex={-1} className="modal-panel flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">{titleMap[field]}</h2>
          <button type="button" onClick={onClose} className="icon-btn h-10 w-10" aria-label="닫기">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {field === 'subjectType' && renderOptions('subjectType', courseTypes, (value) => applySimple('subjectType', value))}
          {field === 'grade' && renderOptions('grade', grades, (value) => applySimple('grade', value))}
          {field === 'credits' && renderOptions('credits', creditOptions, (value) => applySimple('credits', value))}
          {field === 'dayOfWeek' && renderOptions('dayOfWeek', filterDaysOfWeek, applyDay)}
          {field === 'time' && (
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="시작 교시 필터"
                value={filters.startTime}
                active={filters.startTime !== '전체'}
                disabled={filters.dayOfWeek === UNASSIGNED_TIME_FILTER}
                onChange={(event) => setFilters(prev => ({ ...prev, startTime: event.target.value }))}
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
                onChange={(event) => setFilters(prev => ({ ...prev, endTime: event.target.value }))}
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time === '전체' ? '종료' : `${time}교시`}</option>
                ))}
              </FilterSelect>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const accountMajorTabs = [
  { type: 'PRIMARY', label: '전공', required: true },
  { type: 'DOUBLE', label: '복수전공', required: false },
  { type: 'MINOR', label: '부전공', required: false },
];

const emptyAccountMajorSelections = {
  PRIMARY: '',
  DOUBLE: '',
  MINOR: '',
};

const findGroupIdByDepartment = (department) => (
  departmentGroups.find(group => group.departments.includes(department))?.id || ''
);

const buildAccountMajorSelections = (user) => {
  const selections = { ...emptyAccountMajorSelections };

  if (Array.isArray(user?.majors)) {
    user.majors.forEach(major => {
      if (major?.type in selections && major.department) {
        selections[major.type] = major.department;
      }
    });
  }

  if (!selections.PRIMARY && user?.major) {
    selections.PRIMARY = user.major;
  }

  return selections;
};

const buildAccountMajorGroupSelections = (majorSelections) => (
  Object.entries(majorSelections).reduce((acc, [type, department]) => ({
    ...acc,
    [type]: findGroupIdByDepartment(department),
  }), {})
);

const AccountModal = ({ user, onClose, onLogout, onWithdraw, onUpdateProfile, isWithdrawing, isUpdatingProfile }) => {
  const [profileGrade, setProfileGrade] = useState(user?.grade || 1);
  const [activeMajorType, setActiveMajorType] = useState('PRIMARY');
  const [profileMajors, setProfileMajors] = useState(() => buildAccountMajorSelections(user));
  const [profileMajorGroups, setProfileMajorGroups] = useState(() => buildAccountMajorGroupSelections(buildAccountMajorSelections(user)));
  const [profileError, setProfileError] = useState('');
  const isBusy = isWithdrawing || isUpdatingProfile;
  const panelRef = useRef(null);
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  useEffect(() => {
    const nextMajors = buildAccountMajorSelections(user);
    setProfileGrade(user?.grade || 1);
    setProfileMajors(nextMajors);
    setProfileMajorGroups(buildAccountMajorGroupSelections(nextMajors));
    setProfileError('');
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  const displayName = user?.nickname || user?.username || '사용자';
  const displayMajors = Array.isArray(user?.majors) && user.majors.length > 0
    ? user.majors
    : (user?.major ? [{ type: 'PRIMARY', label: '전공', department: user.major }] : []);
  const gradeOptions = [1, 2, 3, 4].map(grade => ({
    value: grade,
    label: `${grade}학년`,
  }));
  const activeMajorTab = accountMajorTabs.find(tab => tab.type === activeMajorType) || accountMajorTabs[0];
  const activeMajorGroup = departmentGroups.find(group => group.id === profileMajorGroups[activeMajorType]);
  const activeDepartmentOptions = activeMajorGroup?.departments || [];
  const majorGroupOptions = [
    ...(!profileMajorGroups[activeMajorType] ? [{ value: '', label: activeMajorTab.required ? '단과대 선택' : '선택 안 함' }] : []),
    ...(!activeMajorTab.required && profileMajorGroups[activeMajorType] ? [{ value: '', label: '선택 안 함' }] : []),
    ...departmentGroups.map(group => ({ value: group.id, label: group.label })),
  ];
  const majorDepartmentOptions = [
    ...(!profileMajors[activeMajorType] ? [{ value: '', label: activeMajorTab.required ? '학과 선택' : '선택 안 함' }] : []),
    ...(!activeMajorTab.required && profileMajors[activeMajorType] ? [{ value: '', label: '선택 안 함' }] : []),
    ...activeDepartmentOptions.map(department => ({ value: department, label: department })),
  ];

  const handleMajorGroupChange = (type, groupId) => {
    const selectedGroup = departmentGroups.find(group => group.id === groupId);
    setProfileMajorGroups(prev => ({ ...prev, [type]: groupId }));
    setProfileMajors(prev => ({
      ...prev,
      [type]: selectedGroup?.departments[0] || '',
    }));
    setProfileError('');
  };

  const handleMajorDepartmentChange = (type, department) => {
    setProfileMajors(prev => ({ ...prev, [type]: department }));
    setProfileError('');
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const selectedMajors = accountMajorTabs
      .map(tab => ({
        type: tab.type,
        department: profileMajors[tab.type],
      }))
      .filter(selection => selection.department);

    if (!profileMajors.PRIMARY) {
      setProfileError('전공 학과를 선택해주세요.');
      return;
    }

    setProfileError('');
    try {
      await onUpdateProfile({
        grade: Number(profileGrade),
        major: profileMajors.PRIMARY,
        majors: selectedMajors,
      });
    } catch {
      // 부모 컴포넌트에서 토스트로 실패 사유를 안내한다.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="account-modal-title" className="modal-panel max-h-[calc(100vh-24px)] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">내 계정</p>
            <h2 id="account-modal-title" className="mt-1 text-lg font-bold text-slate-900">{displayName}님</h2>
            <p className="mt-1 text-sm text-slate-500">{user?.major || '전공 미입력'} {user?.grade ? `${user.grade}학년` : ''}</p>
            {displayMajors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayMajors.map(major => (
                  <span key={`${major.type}-${major.department}`} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {major.label || '전공'} · {major.department}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} className="icon-btn h-9 w-9" aria-label="계정 창 닫기">
            <X size={17} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">회원정보 수정</p>
                <p className="mt-1 text-xs text-slate-500">학년과 전공 학과를 바꿀 수 있어요.</p>
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="btn-primary h-9 px-3 text-xs"
              >
                {isUpdatingProfile ? '저장 중...' : '저장'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-slate-600">학년</span>
                <AuthSelect
                  label="학년 선택"
                  value={profileGrade}
                  options={gradeOptions}
                  active={Boolean(profileGrade)}
                  disabled={isBusy}
                  onChange={(nextGrade) => setProfileGrade(Number(nextGrade))}
                />
              </label>
              <div className="col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium text-slate-600">선택한 전공</span>
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2">
                  {accountMajorTabs.map(tab => (
                    profileMajors[tab.type] ? (
                      <span key={tab.type} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {tab.label} · {profileMajors[tab.type]}
                      </span>
                    ) : null
                  ))}
                  {!profileMajors.PRIMARY && (
                    <span className="px-1 text-[12px] font-medium text-slate-400">전공 학과를 선택해주세요</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                {accountMajorTabs.map(tab => (
                  <button
                    key={tab.type}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveMajorType(tab.type)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-colors ${activeMajorType === tab.type ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-slate-600">단과대</span>
                  <AuthSelect
                    label={`${activeMajorTab.label} 단과대 선택`}
                    value={profileMajorGroups[activeMajorType]}
                    options={majorGroupOptions}
                    active={Boolean(profileMajorGroups[activeMajorType])}
                    disabled={isBusy}
                    optionWrap
                    onChange={(nextGroupId) => handleMajorGroupChange(activeMajorType, nextGroupId)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-slate-600">학과</span>
                  <AuthSelect
                    label={`${activeMajorTab.label} 학과 선택`}
                    value={profileMajors[activeMajorType]}
                    options={majorDepartmentOptions}
                    active={Boolean(profileMajors[activeMajorType])}
                    disabled={isBusy || !activeMajorGroup}
                    optionWrap
                    onChange={(nextDepartment) => handleMajorDepartmentChange(activeMajorType, nextDepartment)}
                  />
                </label>
              </div>
            </div>

            {profileError && (
              <p className="mt-3 text-xs font-semibold text-rose-600">{profileError}</p>
            )}
          </form>

          <button
            type="button"
            onClick={onLogout}
            disabled={isBusy}
            className="btn-secondary h-11 w-full justify-center rounded-xl"
          >
            <LogOut size={15} /> 로그아웃
          </button>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white text-rose-600 ring-1 ring-rose-200">
                <AlertTriangle size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-900">회원 탈퇴</p>
                <p className="mt-1 text-sm leading-6 text-rose-800">
                  로그인 정보는 익명화되고 다시 로그인할 수 없습니다. 과목 선택 기록은 누적 이용자와 기능 개선 통계용으로만 남습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={isBusy}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              <Trash2 size={15} /> {isWithdrawing ? '탈퇴 처리 중...' : '회원 탈퇴'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 메인 애플리케이션 컴포넌트
function AppContent() {
  const { user, isLoggedIn, isLoading: authLoading, logout, withdraw, updateProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' });
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // 페이지 상태 관리
  const [currentView, setCurrentView] = useState('timetable'); // 'login' | 'portal' | 'timetable'

  /* New State for Wishlist Modal Mode */
  const [wishlistModalMode, setWishlistModalMode] = useState('list'); // 'list' | 'setup'

  // 상태 관리
  const [courses, setCourses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false); // 모바일: 첫 화면은 시간표만, + 누르면 검색/과목 리스트 표시
  const [mobileFilterField, setMobileFilterField] = useState(null); // 모바일: 단일 필터 시트로 열 필드(null이면 닫힘)
  const [timetable, setTimetable] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // 무한 스크롤 추가 로드(누적) 전용 — 첫 로드/재검색과 분리

  // 모달 상태
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState(null);
  const [showTimetableListModal, setShowTimetableListModal] = useState(false);

  const timetableRef = useRef(null);
  const timetableExportRef = useRef(null);
  const resultsListRef = useRef(null);
  const loadMoreRef = useRef(null);
  const searchInputRef = useRef(null);
  const courseRequestSeqRef = useRef(0);
  const lastClickRefs = useRef({}); // { [courseId]: timestamp }
  const [isExportingImage, setIsExportingImage] = useState(false);


  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(20); // 페이지당 20개 항목

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewUserTutorial, setShowNewUserTutorial] = useState(false);
  const [showDeveloperNotes, setShowDeveloperNotes] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // 시간표 조합 결과
  const [combinationResults, setCombinationResults] = useState(null);
  const [showCombinationResults, setShowCombinationResults] = useState(false);
  const [isApplyingCombination, setIsApplyingCombination] = useState(false);

  // 목표 학점 설정
  const [targetCredits, setTargetCredits] = useState(18);

  // 희망 공강 요일 설정
  const [freeDays, setFreeDays] = useState([]);
  const wishlistCredits = wishlist.reduce((acc, c) => acc + c.credits, 0);
  const showWishlistCountPreview = import.meta.env.DEV;

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  }, []);

  const closeNewUserTutorial = useCallback(() => {
    setShowNewUserTutorial(false);
  }, []);





  // 사용자 데이터 로드 - 인증 로딩 완료 후 실행
  useEffect(() => {
    console.log('useEffect 실행 - authLoading:', authLoading, 'user:', user);
    if (!authLoading && user) {
      console.log('✅ 조건 만족, loadUserData 호출');
      loadUserData();
    }
  }, [user, authLoading]);



  const loadCourses = async (page = 0, append = false) => {
    const requestSeq = courseRequestSeqRef.current + 1;
    courseRequestSeqRef.current = requestSeq;
    const isLatestRequest = () => requestSeq === courseRequestSeqRef.current;

    try {
      // append(무한 스크롤 다음 페이지)일 때는 전체 리스트를 스켈레톤으로 교체하지 않도록 별도 플래그를 쓴다.
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      // 학년 필터 변환 ("1학년" -> 1, "전체" -> undefined)
      const gradeFilter = filters.grade === '전체' ? undefined :
        parseInt(filters.grade.replace('학년', ''));
      const isUnassignedTimeFilter = filters.dayOfWeek === UNASSIGNED_TIME_FILTER;
      const departmentFilterParams = getDepartmentFilterParams(filters.department);

      const response = await subjectAPI.filter({
        subjectName: searchTerm,
        ...departmentFilterParams,
        subjectType: filters.subjectType,
        grade: gradeFilter,
        credits: filters.credits === '전체' ? undefined : parseInt(filters.credits.replace('학점', '')),
        dayOfWeek: filters.dayOfWeek === '전체' || isUnassignedTimeFilter ? undefined : filters.dayOfWeek,
        startTime: filters.startTime === '전체' || isUnassignedTimeFilter ? undefined : filters.startTime,
        endTime: filters.endTime === '전체' || isUnassignedTimeFilter ? undefined : filters.endTime,
        unassignedTime: isUnassignedTimeFilter ? true : undefined
      }, page, pageSize);

      if (!isLatestRequest()) {
        return;
      }

      // 페이징 응답 처리
      console.log('📥 API 응답 데이터:', response);

      if (response.content) {
        // 백엔드에서 페이징 응답이 온 경우
        console.log(`✅ 페이징 응답: ${response.content.length}개 항목, 총 ${response.totalElements}개 중 ${response.number + 1}/${response.totalPages} 페이지`);
        const formattedCourses = response.content.map((subject, index) => formatCourse(subject, index));
        setCourses(append ? prev => [...prev, ...formattedCourses] : formattedCourses);
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
        setCurrentPage(response.number || 0);
      } else {
        // 기존 배열 응답 (백엔드 미수정 시 호환성)
        console.log(`배열 응답: ${response.length}개 항목 (페이징 미적용)`);
        const formattedCourses = response.map((subject, index) => formatCourse(subject, index));
        setCourses(append ? prev => [...prev, ...formattedCourses] : formattedCourses);
        setTotalPages(1);
        setTotalElements(formattedCourses.length);
        setCurrentPage(0);
      }
    } catch (error) {
      if (!isLatestRequest()) {
        return;
      }

      console.log('서버 연결 실패, Mock 데이터 사용:', error.message);
      // Fallback to comprehensive mock data if server is not available
      const mockData = [
        { id: 1, subjectName: '운영체제', credits: 3, professor: '김교수', department: '컴퓨터공학부', subjectType: '전심', schedules: [{ dayOfWeek: '월', startTime: 7.0, endTime: 8.5 }, { dayOfWeek: '수', startTime: 5.0, endTime: 6.5 }] },
        { id: 2, subjectName: '알고리즘', credits: 3, professor: '이교수', department: '컴퓨터공학부', subjectType: '전핵', schedules: [{ dayOfWeek: '화', startTime: 3.0, endTime: 4.5 }, { dayOfWeek: '목', startTime: 7.0, endTime: 8.5 }] },
        { id: 3, subjectName: '데이터베이스', credits: 3, professor: '박교수', department: '컴퓨터공학부', subjectType: '전핵', schedules: [{ dayOfWeek: '금', startTime: 1.0, endTime: 3.5 }] },
        { id: 4, subjectName: '임베디드시스템', credits: 3, professor: '최교수', department: '컴퓨터공학부', subjectType: '전심', schedules: [{ dayOfWeek: '월', startTime: 3.0, endTime: 4.5 }, { dayOfWeek: '수', startTime: 3.0, endTime: 4.5 }] },
        { id: 5, subjectName: '임베디드소프트웨어', credits: 3, professor: '장교수', department: '컴퓨터공학부', subjectType: '전핵', schedules: [{ dayOfWeek: '화', startTime: 1.0, endTime: 2.5 }, { dayOfWeek: '목', startTime: 1.0, endTime: 2.5 }] },
        { id: 6, subjectName: '시스템공학개론', credits: 3, professor: '윤교수', department: '산업공학과', subjectType: '전핵', schedules: [{ dayOfWeek: '화', startTime: 5.0, endTime: 6.5 }, { dayOfWeek: '목', startTime: 5.0, endTime: 6.5 }] },
        { id: 7, subjectName: '영어회화', credits: 2, professor: 'Smith', department: '교양학부', subjectType: '기교', schedules: [{ dayOfWeek: '수', startTime: 1.0, endTime: 2.5 }] },
        { id: 8, subjectName: '한국사', credits: 2, professor: '홍교수', department: '교양학부', subjectType: '기교', schedules: [{ dayOfWeek: '금', startTime: 7.0, endTime: 8.5 }] },
        { id: 9, subjectName: '미적분학', credits: 3, professor: '정교수', department: '수학과', subjectType: '기교', schedules: [{ dayOfWeek: '월', startTime: 1.0, endTime: 2.5 }, { dayOfWeek: '수', startTime: 7.0, endTime: 8.5 }] },
        { id: 10, subjectName: '물리학실험', credits: 1, professor: '서교수', department: '물리학과', subjectType: '기교', schedules: [{ dayOfWeek: '금', startTime: 3.0, endTime: 5.5 }] },
        // Mock 데이터를 더 추가하여 페이징 테스트
        ...Array.from({ length: 50 }, (_, i) => ({
          id: 100 + i,
          subjectName: `테스트과목${i + 1}`,
          credits: 2 + (i % 3),
          professor: `테스트교수${i + 1}`,
          department: i % 2 === 0 ? '컴퓨터공학부' : '교양학부',
          subjectType: i % 3 === 0 ? '전핵' : i % 3 === 1 ? '전심' : '기교',
          schedules: [{ dayOfWeek: ['월', '화', '수', '목', '금'][i % 5], startTime: 1.0 + (i % 8), endTime: 2.5 + (i % 8) }]
        })),
      ];
      // Mock 데이터도 페이징 시뮬레이션
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedMockData = mockData.slice(startIndex, endIndex);

      const formattedCourses = paginatedMockData.map((subject, index) => formatCourse(subject, index));
      setCourses(append ? prev => [...prev, ...formattedCourses] : formattedCourses);
      setTotalPages(Math.ceil(mockData.length / pageSize));
      setTotalElements(mockData.length);
      setCurrentPage(page);
    } finally {
      if (isLatestRequest()) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  const loadUserData = async () => {
    if (!user) {
      console.log('🚫 loadUserData: user가 없어서 리턴');
      return;
    }

    console.log('🔄 loadUserData 시작, user:', user.id);

    try {
      // 위시리스트 로드
      console.log('📋 위시리스트 API 호출 중...');
      const wishlistData = await wishlistAPI.getByUser(user.id, CURRENT_SEMESTER);
      console.log('✅ 위시리스트 데이터 받음:', wishlistData);

      const formattedWishlist = wishlistData.map((item) => {
        console.log('위시리스트 아이템:', item);

        // 새로운 API 응답: 아이템 자체가 모든 과목 정보를 포함
        return {
          // 위시리스트 고유 ID는 wishlistId로 저장하고, 과목 ID는 subjectId 사용
          id: item.subjectId, // 과목 ID를 사용 (중요!)
          wishlistId: item.id, // 위시리스트 아이템 고유 ID
          name: item.subjectName,
          credits: item.credits,
          professor: item.professor,
          department: item.department,
          type: item.subjectType,
          grade: item.grade,
          classMethod: item.classMethod,
          isNight: item.isNight,
          schedules: item.schedules,
          time: item.schedules && Array.isArray(item.schedules) ?
            item.schedules.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(', ') : '',
          rating: 4.0, // 기본값
          reviews: 0, // 기본값
          isRequired: item.isRequired || false,
          ...getCourseTypeColorScheme(item.subjectType)
        };
      });
      console.log('📋 포맷된 위시리스트:', formattedWishlist);
      setWishlist(formattedWishlist);

      // 개인 시간표 로드
      const timetableData = await timetableAPI.getByUser(user.id, CURRENT_SEMESTER);
      const formattedTimetable = timetableData.map((item, index) =>
        formatCourse(item.subject, index)
      );
      setTimetable(formattedTimetable);
    } catch (error) {
      console.log('사용자 데이터 로드 실패:', error.message);
    }
  };

  // 검색 실행 함수
  const executeSearch = () => {
    setCurrentPage(0); // 검색 시 첫 페이지로 리셋
    loadCourses(0);
    // 재검색/필터 변경(리스트 교체)마다 스크롤을 위로 리셋 — 무한스크롤로 내려간 위치와 어긋나지 않게.
    resultsListRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  const defaultFilters = { department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' };
  const activeFilterCount = Object.values(filters).filter(value => value !== '전체').length;
  const userMajorShortcuts = useMemo(() => {
    if (!user) {
      return [];
    }

    const savedMajors = Array.isArray(user.majors) && user.majors.length > 0
      ? user.majors
      : (user.major ? [{ type: 'PRIMARY', label: '전공', department: user.major }] : []);

    const seenDepartments = new Set();
    return savedMajors.reduce((shortcuts, item) => {
      if (!item?.department || seenDepartments.has(item.department)) {
        return shortcuts;
      }

      seenDepartments.add(item.department);
      shortcuts.push({
          type: item.type || item.label || item.department,
          label: item.label || (item.type === 'DOUBLE' ? '복수전공' : item.type === 'MINOR' ? '부전공' : '전공'),
          department: item.department,
      });
      return shortcuts;
    }, []);
  }, [user]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({ ...defaultFilters });
  };

  // 엔터키 검색
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };

  // 필터 변경 시에만 자동 검색 (검색어는 수동)
  useEffect(() => {
    executeSearch();
  }, [filters]); // searchTerm 제거, filters만 자동 검색

  useEffect(() => {
    // 무한 스크롤 append(currentPage 증가) 시엔 펼친 과목이 닫히지 않도록 filters/searchTerm 변경 때만 리셋.
    setExpandedCourseId(null);
  }, [filters, searchTerm]);

  // 페이징이 적용되었으므로 클라이언트 필터링 제거 (서버에서 처리)
  const filteredCourses = courses;

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadCourses(newPage);
    // 페이지 변경 시 리스트와 페이지 맨 위로 스크롤
    resultsListRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 모바일 무한 스크롤: 리스트 끝의 sentinel 이 보이면 다음 페이지를 누적 로드한다.
  // (sentinel 은 md:hidden 이라 데스크톱에서는 관찰되지 않고 페이지네이션이 유지된다.)
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading && !isLoadingMore && currentPage + 1 < totalPages) {
        loadCourses(currentPage + 1, true);
      }
    }, { rootMargin: '120px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentPage, totalPages, isLoading, isLoadingMore]);

  const downloadCanvasAsPng = async (canvas, fileName) => {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const link = document.createElement('a');

    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    }

    link.href = canvas.toDataURL('image/png');
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportTimetableImage = async () => {
    if (!timetable || timetable.length === 0) {
      showToast('시간표에 과목을 먼저 담아주세요.', 'warning');
      return;
    }

    if (!timetableExportRef.current) {
      showToast('시간표 저장 화면을 준비하지 못했어요.', 'warning');
      return;
    }

    try {
      setIsExportingImage(true);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const exportNode = timetableExportRef.current;
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(exportNode, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        windowWidth: exportNode.scrollWidth,
        windowHeight: exportNode.scrollHeight
      });

      const today = new Date().toISOString().slice(0, 10);
      await downloadCanvasAsPng(canvas, `inu-timetable-${today}.png`);
      showToast('시간표를 이미지로 저장했어요!');
    } catch (error) {
      console.error('시간표 이미지 저장 실패:', error);
      showToast('이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsExportingImage(false);
    }
  };





  const handleAddToTimetable = async (courseToAdd) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // 따닥(더블 클릭) 방지: 0.5초 이내 동일 과목 요청 무시
    const now = Date.now();
    const lastClick = lastClickRefs.current[courseToAdd.id] || 0;
    if (now - lastClick < 500) {
      console.log(`[Throttle] 중복 시간표 추가 요청 방지: ${courseToAdd.name}`);
      return;
    }
    lastClickRefs.current[courseToAdd.id] = now;

    if (timetable.find(course => course.id === courseToAdd.id)) {
      showToast(`'${courseToAdd.name}' 과목은 이미 시간표에 있어요.`, 'warning');
      return;
    }

    const conflictingCourse = timetable.find(course => checkConflict(course, courseToAdd));
    if (conflictingCourse) {
      showToast(`'${courseToAdd.name}' 과목은 '${conflictingCourse.name}' 과목과 시간이 겹쳐요!`, 'warning');
      return;
    }

    const optimisticCourse = formatCourse(courseToAdd);
    setTimetable(prev => [...prev, optimisticCourse]);
    showToast(`'${courseToAdd.name}' 과목을 시간표에 추가했어요!`);

    try {
      await timetableAPI.add({
        userId: user.id,
        subjectId: courseToAdd.id,
        semester: CURRENT_SEMESTER,
        memo: ''
      });
    } catch (error) {
      setTimetable(prev => prev.filter(course => course.id !== courseToAdd.id));

      // 에러 메시지 처리
      if (error.message.includes('시간') || error.message.includes('충돌') || error.message.includes('겹치')) {
        showToast(`'${courseToAdd.name}' 과목은 기존 시간표와 시간이 겹쳐서 되돌렸어요.`, 'warning');
      } else if (error.message.includes('이미') || error.message.includes('중복')) {
        showToast(`'${courseToAdd.name}' 과목은 이미 시간표에 있어요.`, 'warning');
      } else {
        showToast(`시간표 추가 실패: ${error.message}`, 'error');
      }
    }
  };

  const handleAddToWishlist = async (courseToAdd, isRequired = false) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // 따닥(더블 클릭) 방지: 0.5초 이내 동일 과목 요청 무시
    const now = Date.now();
    const lastClick = lastClickRefs.current[courseToAdd.id] || 0;
    if (now - lastClick < 500) {
      console.log(`[Throttle] 중복 위시리스트 요청 방지: ${courseToAdd.name}`);
      return;
    }
    lastClickRefs.current[courseToAdd.id] = now;

    if (wishlist.find(c => c.id === courseToAdd.id)) {
      showToast(`'${courseToAdd.name}' 과목은 이미 위시리스트에 있어요.`, 'warning');
      return;
    }

    try {
      await wishlistAPI.add({
        userId: user.id,
        subjectId: courseToAdd.id,
        semester: CURRENT_SEMESTER,
        priority: 3,
        isRequired: isRequired
      });
      setWishlist(prev => [...prev, { ...courseToAdd, isRequired }]);
      showToast(`'${courseToAdd.name}' 과목을 위시리스트에 담았어요!`);
    } catch (error) {
      showToast(error.message, 'warning');
    }
  };

  const handleRemoveFromWishlist = async (courseId) => {
    try {
      await wishlistAPI.remove(user.id, courseId);
      setWishlist(prev => prev.filter(course => course.id !== courseId));
      showToast('위시리스트에서 제거했어요!');
    } catch (error) {
      showToast(error.message, 'warning');
    }
  };

  const handleToggleRequired = async (courseId, currentIsRequired) => {
    try {
      await wishlistAPI.updateRequired({
        userId: user.id,
        subjectId: courseId,
        isRequired: !currentIsRequired
      });

      setWishlist(prev => prev.map(course =>
        course.id === courseId
          ? { ...course, isRequired: !currentIsRequired }
          : course
      ));

      const course = wishlist.find(c => c.id === courseId);
      const courseName = course?.name || '선택한 과목';
      showToast(`'${courseName}' 과목을 ${!currentIsRequired ? '필수' : '선택'} 과목으로 변경했어요!`);
    } catch (error) {
      showToast(error.message, 'warning');
    }
  };

  const handleRunGenerator = async () => {
    if (!isLoggedIn || wishlist.length === 0) {
      showToast('로그인 후 위시리스트에 과목을 추가해주세요!', 'warning');
      return;
    }

    // 필수 과목들 간 시간 충돌 검사
    const requiredCourses = wishlist.filter(course => course.isRequired);
    if (requiredCourses.length > 1) {
      for (let i = 0; i < requiredCourses.length; i++) {
        for (let j = i + 1; j < requiredCourses.length; j++) {
          if (checkConflict(requiredCourses[i], requiredCourses[j])) {
            showToast(`필수 과목 '${requiredCourses[i].name}'와 '${requiredCourses[j].name}'이 시간이 겹칩니다!`, 'warning');
            return;
          }
        }
      }
    }

    setIsGenerating(true);
    try {
      const response = await combinationAPI.generate({
        userId: user.id,
        semester: CURRENT_SEMESTER,
        targetCredits: targetCredits,
        maxCombinations: 20,
        freeDays: freeDays
      });

      setTimeout(() => {
        setIsGenerating(false);
        setCombinationResults(response);
        setShowCombinationResults(true);
        showToast(`${response.totalCount}개의 시간표 조합을 찾았습니다!`);
      }, 3000);
    } catch (error) {
      setIsGenerating(false);
      console.log('시간표 조합 생성 실패, Mock 데이터 사용:', error.message);

      // 필수 과목이 있으면 Mock 데이터에도 반영
      const requiredCoursesInMock = requiredCourses.slice(0, 2); // 최대 2개만 사용
      const mockOptionalCourses = [
        {
          id: 3,
          subjectName: "데이터베이스",
          credits: 3,
          professor: "박교수",
          schedules: [
            { id: 5, dayOfWeek: "금", startTime: 1.0, endTime: 3.5 }
          ],
          isNight: false,
          subjectType: "전핵",
          classMethod: "OFFLINE",
          grade: 3,
          department: "컴퓨터공학부"
        },
        {
          id: 7,
          subjectName: "영어회화",
          credits: 2,
          professor: "Smith",
          schedules: [
            { id: 7, dayOfWeek: "수", startTime: 1.0, endTime: 2.5 }
          ],
          isNight: false,
          subjectType: "기교",
          classMethod: "OFFLINE",
          grade: 1,
          department: "교양학부"
        }
      ];

      // Mock 조합 생성 (필수 과목 포함)
      const mockCombination1 = [
        ...requiredCoursesInMock.map(course => ({
          id: course.id,
          subjectName: course.name,
          credits: course.credits,
          professor: course.professor,
          schedules: course.schedules || [{ id: course.id, dayOfWeek: "월", startTime: 1.0, endTime: 2.5 }],
          isNight: false,
          subjectType: course.type || "전핵",
          classMethod: "OFFLINE",
          grade: 3,
          department: course.department || "컴퓨터공학부"
        })),
        ...mockOptionalCourses.slice(0, Math.max(1, targetCredits / 3 - requiredCoursesInMock.length))
      ];

      const mockCombinationResults = {
        combinations: [mockCombination1],
        totalCount: 1,
        targetCredits: targetCredits,
        statistics: [
          {
            totalCredits: mockCombination1.reduce((sum, course) => sum + course.credits, 0),
            subjectCount: mockCombination1.length,
            subjectTypeDistribution: {
              "전핵": mockCombination1.filter(c => c.subjectType === "전핵").length,
              "전심": mockCombination1.filter(c => c.subjectType === "전심").length,
              "기교": mockCombination1.filter(c => c.subjectType === "기교").length
            },
            dayDistribution: {}
          }
        ]
      };

      setTimeout(() => {
        setIsGenerating(false);
        setCombinationResults(mockCombinationResults);
        setShowCombinationResults(true);
        showToast(`${mockCombinationResults.totalCount}개의 시간표 조합을 찾았습니다! (Mock 데이터)`);
      }, 3000);
    }
  };

  // 시간표 조합 선택 핸들러
  const handleSelectCombination = async (selectedCombination) => {
    if (!user) {
      showToast('로그인 후 시간표 조합을 적용할 수 있어요.', 'warning');
      return;
    }

    if (isApplyingCombination) return;

    setIsApplyingCombination(true);
    try {
      console.log('🔄 조합 선택:', selectedCombination);

      // 기존 시간표 클리어
      for (const course of timetable) {
        await timetableAPI.remove(user.id, course.id);
      }

      // 새로운 조합 추가
      for (const subject of selectedCombination) {
        await timetableAPI.add({
          userId: user.id,
          subjectId: subject.id,
          semester: CURRENT_SEMESTER,
          memo: ''
        });
      }

      // 로컬 상태 업데이트
      const formattedCombination = selectedCombination.map((subject, index) => {
        console.log('📝 포맷팅 중인 과목:', subject);
        const formatted = formatCourse(subject, index);
        console.log('✅ 포맷된 결과:', formatted);
        return formatted;
      });

      console.log('Selected timetable combination:', formattedCombination);
      setTimetable(formattedCombination);

      setShowCombinationResults(false);
      showToast('시간표에 선택한 조합이 적용되었습니다!');
    } catch (error) {
      console.error('❌ 조합 선택 오류:', error);
      try {
        const latestTimetable = await timetableAPI.getByUser(user.id, CURRENT_SEMESTER);
        const latestCourses = latestTimetable.map((subject, index) => formatCourse(subject, index));
        setTimetable(latestCourses);
        showToast('시간표 적용 중 오류가 발생해 서버 상태로 다시 동기화했어요.', 'warning');
      } catch (syncError) {
        console.error('❌ 시간표 재동기화 실패:', syncError);
        showToast('시간표 적용 중 오류가 발생했습니다. 새로고침 후 다시 확인해주세요.', 'warning');
      }
    } finally {
      setIsApplyingCombination(false);
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const clearPersonalState = () => {
    setWishlist([]);
    setTimetable([]);
    setFilters({ department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' });
    setShowWishlistModal(false);
    setShowTimetableListModal(false);
    setShowCombinationResults(false);
    setCombinationResults(null);
  };

  const handleLogout = async () => {
    await logout();
    clearPersonalState();
    setShowAccountModal(false);
    showToast('로그아웃되었습니다.');
  };

  const handleWithdraw = async () => {
    if (isWithdrawing) return;

    setIsWithdrawing(true);
    try {
      await withdraw();
      clearPersonalState();
      setShowAccountModal(false);
      showToast('회원탈퇴가 완료되었습니다. 계정 정보는 익명화되었어요.');
    } catch (error) {
      showToast(`회원탈퇴 실패: ${error.message}`, 'warning');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleUpdateProfile = async (profileData) => {
    if (isUpdatingProfile) return;

    setIsUpdatingProfile(true);
    try {
      await updateProfile(profileData);
      setShowAccountModal(false);
      showToast('회원정보가 수정되었습니다.');
    } catch (error) {
      showToast(`회원정보 수정 실패: ${error.message}`, 'warning');
      throw error;
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 시간표에서 과목 제거
  const handleRemoveFromTimetable = async (courseToRemove) => {
    if (!isLoggedIn) return;

    // Optimistic Update: 먼저 UI를 업데이트
    const previousTimetable = [...timetable];
    const updatedTimetable = timetable.filter(course => course.id !== courseToRemove.id);
    setTimetable(updatedTimetable);
    showToast(`'${courseToRemove.name}' 과목을 시간표에서 제거했어요!`);

    try {
      await timetableAPI.remove(user.id, courseToRemove.id);
      console.log('✅ 시간표 제거 성공:', courseToRemove.name);

      // 서버에서 최신 시간표 데이터를 다시 불러와서 동기화
      setTimeout(async () => {
        try {
          const timetableData = await timetableAPI.getByUser(user.id, CURRENT_SEMESTER);
          const formattedTimetable = timetableData.map((item, index) =>
            formatCourse(item.subject, index)
          );
          setTimetable(formattedTimetable);
          console.log('🔄 시간표 동기화 완료');
        } catch (syncError) {
          console.warn('시간표 동기화 실패:', syncError.message);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ 시간표 제거 실패:', error);

      // Rollback: 실패시 이전 상태로 되돌리기
      setTimetable(previousTimetable);
      showToast(`시간표 제거 실패: ${error.message}`, 'error');
    }
  };

  // 시간표 전체 삭제
  const handleClearAllTimetable = async () => {
    if (!isLoggedIn) return;

    if (!window.confirm('시간표를 전체 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    // Optimistic Update: 먼저 UI를 업데이트
    const previousTimetable = [...timetable];
    setTimetable([]);
    showToast('시간표를 전체 삭제했어요!');

    try {
      // 각 과목을 개별적으로 삭제 (API에 bulk delete가 없다면)
      const deletePromises = previousTimetable.map(course =>
        timetableAPI.remove(user.id, course.id)
      );

      await Promise.all(deletePromises);
      console.log('✅ 시간표 전체 삭제 성공');

    } catch (error) {
      console.error('❌ 시간표 전체 삭제 실패:', error);
      // 실패 시 이전 상태로 롤백
      setTimetable(previousTimetable);
      showToast(`시간표 전체 삭제에 실패했어요: ${error.message}`, 'warning');
    }
  };

  // 시간표 리스트 보기
  const handleShowTimetableList = () => {
    setShowTimetableListModal(true);
  };

  // 과목 상세 정보 보기
  const handleViewCourseDetails = (course) => {
    setSelectedCourseForDetail(course);
    setShowCourseDetailModal(true);
  };

  // 시간표에서 위시리스트로 이동
  const handleMoveToWishlistFromTimetable = async (course) => {
    if (!isLoggedIn) return;

    // 이미 위시리스트에 있는지 확인
    if (wishlist.find(c => c.id === course.id)) {
      showToast(`'${course.name}' 과목은 이미 위시리스트에 있어요.`, 'warning');
      return;
    }

    try {
      await wishlistAPI.add({
        userId: user.id,
        subjectId: course.id,
        semester: CURRENT_SEMESTER,
        priority: 3,
        isRequired: false
      });

      setWishlist([...wishlist, { ...course, ...getCourseTypeColorScheme(course.type), isRequired: false }]);
      showToast(`'${course.name}' 과목을 위시리스트에 담았어요!`);
    } catch (error) {
      showToast(`위시리스트 추가 실패: ${error.message}`, 'error');
    }
  };



  // 인천대 로그인 페이지 컴포넌트
  const LoginPage = ({ onLogin }) => (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            인천대학교 대학 <span className="text-blue-600">수강신청</span>
          </h1>
          <p className="text-lg text-gray-600 mb-2">Undergraduate Course Registration</p>
        </div>

        {/* 로그인 박스 */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-800 text-white p-8 rounded-lg shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold">LOGIN</h2>
            </div>

            <div className="flex gap-6">
              {/* 좌측 - 입력 폼 */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">학번 (ID)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-gray-800 rounded border focus:outline-none focus:border-blue-300"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">비밀번호 (PW)</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 text-gray-800 rounded border focus:outline-none focus:border-blue-300"
                    placeholder=""
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={onLogin}
                      className="w-full bg-white text-blue-800 font-semibold py-3 px-4 rounded hover:bg-gray-100 transition-colors text-sm"
                    >
                      로그인
                      <br />
                      <span className="text-xs">(Login)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 우측 - 버튼들 */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-gray-600 text-white font-semibold py-3 px-4 rounded hover:bg-gray-700 transition-colors text-sm">
                    수강신청일정
                  </button>
                  <button className="bg-gray-600 text-white font-semibold py-3 px-4 rounded hover:bg-gray-700 transition-colors text-sm">
                    대학원 수강신청
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-gray-600 text-white font-semibold py-3 px-4 rounded hover:bg-gray-700 transition-colors text-sm">
                    한글정보 및 유의사항
                  </button>
                  <button className="bg-gray-600 text-white font-semibold py-3 px-4 rounded hover:bg-gray-700 transition-colors text-sm">
                    교수자전공 수강신청
                    <br />
                    <span className="text-xs">(지원자만 신청)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 하단 안내사항 */}
            <div className="mt-6 pt-4 border-t border-blue-700">
              <p className="text-xs text-center">
                * 학번(ID) / 비밀번호(PW)를 올바르게 입력하다.
              </p>
              <p className="text-xs text-center mt-1">
                학번(ID) 비밀번호(PW) 찾기
              </p>
            </div>
          </div>

          {/* 모의 수강신청 버튼 */}
          <div className="text-center mt-8">
            <button
              onClick={() => setCurrentView('timetable')}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
            >
              모의 수강신청으로 돌아가기
            </button>
            <p className="text-gray-600 mt-2 text-sm">로그인 없이 시간표 조합을 체험해보세요!</p>
          </div>

          {/* 하단 안내 */}
          <div className="text-center mt-8 text-sm text-red-500">
            <p>※ 수강신청 URL: https://sugang.inu.ac.kr</p>
            <p>※ 추천된 브라우저 버전이 아닌 'Chrome' 브라우저 '최신버전'으로 사용하여 수강생체크를 대 됩니다.(Safari를 사용 불가)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const PortalPage = ({ onBackToLogin, onGoToTimetable }) => {
    const quickMenus = [
      { label: '장바구니', sub: 'Cart' },
      { label: '전공과목', sub: 'Major' },
      { label: '교양과목', sub: 'Liberal Arts' },
      { label: '타학과과목', sub: 'Other Major' },
      { label: '연계전공과목', sub: 'Interdisciplinary Courses' },
      { label: '과목명(코드) 조회', sub: 'Search by Course Title(Code)' },
      { label: '과목별/교수별 조회', sub: 'Search by Course Title/Prof.' },
      { label: '장바구니 확인', sub: 'Check Cart' },
    ];

    return (
      <div className="bg-gray-100 min-h-screen font-sans text-gray-800">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">인천대학교 수강신청</h1>
              <p className="text-sm text-gray-500">INU Course Registration System</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onBackToLogin}
                className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-md border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                로그아웃
              </button>
              <button
                type="button"
                onClick={onGoToTimetable}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow hover:bg-blue-700 transition"
              >
                모의 수강신청으로 이동
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="bg-white shadow-xl rounded-xl overflow-hidden">
            <div className="bg-blue-900 text-white px-6 py-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <p className="uppercase tracking-wide text-sm text-blue-100">2025년도 2학기 수강신청</p>
                  <p className="text-2xl font-semibold">2025 Fall course registration</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-200">학과(부)</p>
                    <p className="font-semibold">임베디드시스템공학과</p>
                  </div>
                  <div>
                    <p className="text-blue-200">학번/성명 ID/Name</p>
                    <p className="font-semibold">202101681 / 장진형</p>
                  </div>
                  <div>
                    <p className="text-blue-200">학년/학적상태 Grade</p>
                    <p className="font-semibold">3 / 재학</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                {quickMenus.map(menu => (
                  <div
                    key={menu.label}
                    className="bg-blue-800/60 border border-blue-700 rounded-md px-3 py-2 text-center leading-tight"
                  >
                    <p className="font-semibold">{menu.label}</p>
                    <p className="text-[11px] text-blue-100">{menu.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-800">
              ※ 주의(전공) : 검정색→주전공과 수업 / 고동색→야간학과 / 회색→미개강과목
            </div>

            <div className="px-6 py-4 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm text-gray-700">
                  <thead>
                    <tr className="bg-blue-100 text-blue-900 border border-blue-200">
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">학년<br />Grade</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">이수구분<br />Course Type</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">학수번호<br />Course No</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-200">교과목명<br />Course Title</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">학점<br />Credit</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">영어여부<br />EN</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-200">요일 및 교시(강의실)<br />Time Table(Lecture room)</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">개설학과<br />Dpt</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">교강사<br />Prof</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-200">신청<br />Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalRegisteredCourses.map(course => (
                      <tr key={course.courseNo} className="border border-blue-100">
                        <td className="px-4 py-3 text-center border border-blue-100">{course.grade}</td>
                        <td className="px-4 py-3 text-center border border-blue-100">{course.type}</td>
                        <td className="px-4 py-3 text-center border border-blue-100">
                          <p>{course.courseNo}</p>
                        </td>
                        <td className="px-4 py-3 border border-blue-100">
                          <p className="font-semibold text-gray-900">{course.courseTitle}</p>
                          <p className="text-xs text-gray-500">{course.courseTitleEn}</p>
                        </td>
                        <td className="px-4 py-3 text-center border border-blue-100">{course.credit}</td>
                        <td className="px-4 py-3 text-center border border-blue-100">{course.english}</td>
                        <td className="px-4 py-3 border border-blue-100 whitespace-pre-wrap">{course.time}</td>
                        <td className="px-4 py-3 text-center border border-blue-100">{course.department}</td>
                        <td className="px-4 py-3 text-center border border-blue-100">{course.professor}</td>
                        <td className="px-4 py-3 text-center border border-blue-100">
                          {course.status === '마감' ? (
                            <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-200 rounded">마감</span>
                          ) : (
                            <button className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition">신청</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-blue-700">
                * 수강신청내역 List of Courses registered ( 삭제 / 삭제할 과목의 취소버튼을 클릭하세요. )
              </p>
            </div>

            <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded shadow hover:bg-blue-800 transition">
                  확인서출력 Print Confirmation
                </button>
                <button className="px-5 py-2 text-sm font-semibold text-white bg-orange-500 rounded shadow hover:bg-orange-400 transition">
                  시간표출력 Print Time table
                </button>
              </div>
              <p className="text-xs text-gray-600">※ 출력 전 팝업 차단을 해제해주세요.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 로그인 화면으로 이동
  const goToLogin = () => {
    setCurrentView('login');
  };

  const isAdminSubjectsPage = window.location.pathname === '/admin/subjects';

  if (isAdminSubjectsPage) {
    return <HiddenPage />;
  }

  if (currentView === 'login') {
    return <LoginPage onLogin={() => setCurrentView('portal')} />;
  }

  if (currentView === 'portal') {
    return (
      <PortalPage
        onBackToLogin={() => setCurrentView('login')}
        onGoToTimetable={() => setCurrentView('timetable')}
      />
    );
  }

  const hasResultPagination = totalPages > 1;
  const canGoToPreviousPage = hasResultPagination && currentPage > 0 && !isLoading;
  const canGoToNextPage = hasResultPagination && currentPage < totalPages - 1 && !isLoading;
  const hasBlockingOverlay = showWishlistModal || showDeveloperNotes || showAccountModal || showFilters || mobileFilterField !== null
    || showAuthModal || showCombinationResults || showCourseDetailModal || showTimetableListModal;
  // App 레벨 오버레이의 body 스크롤 락을 한 곳에서 전역 카운터로 관리한다.
  // (내부 state 로 열리는 시트 3곳은 각자 useBodyScrollLock 을 호출한다.)
  useBodyScrollLock(hasBlockingOverlay);
  const userDisplayName = user?.nickname || user?.username || '사용자';

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast {...toast} onDismiss={() => setToast(prev => ({ ...prev, show: false }))} />
      <LoadingOverlay isGenerating={isGenerating} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showToast={showToast}
        onRegisterSuccess={() => setShowNewUserTutorial(true)}
      />
      <NewUserTutorial shouldStart={showNewUserTutorial} onFinish={closeNewUserTutorial} />
      <WishlistModal
        isOpen={showWishlistModal}
        onClose={() => setShowWishlistModal(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onToggleRequired={handleToggleRequired}
        onAddToTimetable={handleAddToTimetable}
        onViewCourseDetails={handleViewCourseDetails}
        targetCredits={targetCredits}
        setTargetCredits={setTargetCredits}
        freeDays={freeDays}
        setFreeDays={setFreeDays}
        onRunGenerator={handleRunGenerator}
        initialStep={wishlistModalMode}
      />
      <CourseDetailModal
        isOpen={showCourseDetailModal}
        onClose={() => {
          setShowCourseDetailModal(false);
          setSelectedCourseForDetail(null);
        }}
        course={selectedCourseForDetail}
        onAddToTimetable={handleAddToTimetable}
      />
      <TimetableListModal
        isOpen={showTimetableListModal}
        onClose={() => setShowTimetableListModal(false)}
        courses={timetable}
        onRemoveCourse={handleRemoveFromTimetable}
        onAddToWishlist={handleMoveToWishlistFromTimetable}
        onViewCourseDetails={handleViewCourseDetails}
        onClearAll={handleClearAllTimetable}
        onExportImage={handleExportTimetableImage}
      />
      {timetable.length > 0 && (
        <div
          data-export-wrapper
          aria-hidden="true"
          className="pointer-events-none fixed top-0 overflow-hidden"
          style={{ left: '-20000px', width: '760px' }}
        >
          <TimetableExportView
            ref={timetableExportRef}
            courses={timetable}
            semester={CURRENT_SEMESTER}
          />
        </div>
      )}
      {showDeveloperNotes && (
        <DeveloperNotesModal onClose={() => setShowDeveloperNotes(false)} />
      )}

      {showAccountModal && (
        <AccountModal
          user={user}
          onClose={() => setShowAccountModal(false)}
          onLogout={handleLogout}
          onWithdraw={handleWithdraw}
          onUpdateProfile={handleUpdateProfile}
          isWithdrawing={isWithdrawing}
          isUpdatingProfile={isUpdatingProfile}
        />
      )}

      {showCombinationResults && combinationResults && (
        <TimetableCombinationResults
          results={combinationResults}
          onClose={() => setShowCombinationResults(false)}
          onSelectCombination={handleSelectCombination}
          isApplying={isApplyingCombination}
        />
      )}
      <MobileFilterSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        activeFilterCount={activeFilterCount}
        onReset={handleResetFilters}
        majorShortcuts={userMajorShortcuts}
      />

      <MobileSingleFilterSheet
        field={mobileFilterField}
        filters={filters}
        setFilters={setFilters}
        onClose={() => setMobileFilterField(null)}
        majorShortcuts={userMajorShortcuts}
      />

      <header
        aria-hidden={hasBlockingOverlay}
        inert={hasBlockingOverlay ? '' : undefined}
        className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <a href="/" className="flex flex-shrink-0 items-center gap-2">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm">
                <CalendarDays size={17} />
              </span>
              <span className="max-w-[7rem] truncate text-[15px] font-bold tracking-tight text-slate-900">INU 시간표</span>
            </a>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleShowTimetableList}
              className="icon-btn relative hidden h-10 w-10 md:inline-flex lg:hidden"
              title="내 시간표 보기"
              aria-label={`내 시간표 보기${timetable.length > 0 ? `, ${timetable.length}개 과목` : ''}`}
            >
              <CalendarDays size={16} />
              {timetable.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {timetable.length}
                </span>
              )}
            </button>
            {isLoggedIn ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-[13px] font-semibold leading-tight text-slate-900">{userDisplayName}님</p>
                  <p className="text-[11px] leading-tight text-slate-500">
                    {user?.major || '전공 미입력'} {user?.grade ? `${user.grade}학년` : ''}
                  </p>
                </div>
                <button onClick={() => setShowAccountModal(true)} className="btn-ghost h-10 px-3 text-[13px] md:h-8 md:px-2.5">
                  <UserCircle size={14} /> 계정
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="btn-primary h-10 px-3 text-[13px] md:h-8">
                <LogIn size={14} /> 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        aria-hidden={hasBlockingOverlay}
        inert={hasBlockingOverlay ? '' : undefined}
        className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-6"
      >
        <>
        <section aria-label="모바일 시간표" className="sticky top-14 z-20 -mx-4 mb-3 bg-slate-50/95 px-4 pt-2 backdrop-blur md:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex-shrink-0 text-sm font-bold text-slate-900">내 시간표</h2>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setWishlistModalMode('list');
                  setShowWishlistModal(true);
                }}
                aria-label={`담은 과목 ${wishlist.length}개`}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ShoppingCart size={13} /> 담은 {wishlist.length}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWishlistModalMode('setup');
                  setShowWishlistModal(true);
                }}
                disabled={wishlist.length === 0 || isGenerating}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                <Star size={13} /> 조합
              </button>
              <button
                type="button"
                onClick={() => setShowMobileSearch(value => !value)}
                aria-label={showMobileSearch ? '과목 검색 닫기' : '과목 검색 열기'}
                aria-expanded={showMobileSearch}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                {showMobileSearch ? <X size={16} /> : <Plus size={16} />}
              </button>
            </div>
          </div>
          <div className={`rounded-2xl ${showMobileSearch ? 'max-h-[32vh] overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}>
            <h2 className="sr-only">내 시간표 표</h2>
            <TimetableGrid
              courses={timetable}
              onExportImage={handleExportTimetableImage}
              onRemoveCourse={handleRemoveFromTimetable}
              onAddToWishlist={handleMoveToWishlistFromTimetable}
              onViewCourseDetails={handleViewCourseDetails}
              onClearAll={handleClearAllTimetable}
              onShowTimetableList={handleShowTimetableList}
              timetableRef={timetableRef}
              isExportingImage={isExportingImage}
              showTitle={false}
              isMobile
            />
          </div>
        </section>

        {/* 검색 바 */}
        <section
          data-tour="course-search"
          aria-label="과목 검색"
          className={`card p-3 md:p-4 ${showMobileSearch ? '' : 'hidden'} md:block`}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="과목명 검색"
                placeholder="과목명을 검색해 보세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="field h-10 pl-9 md:h-11"
              />
            </div>
            <button
              onClick={executeSearch}
              disabled={isLoading}
              className="btn-primary h-10 px-4 md:h-11 md:px-5"
            >
              <Search size={15} className="sm:hidden" />
              <span className="hidden sm:inline">검색</span>
            </button>
          </div>

          <MobileFilterScroller
            filters={filters}
            searchTerm={searchTerm}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setShowFilters(true)}
            onReset={handleResetFilters}
            onFocusSearch={() => searchInputRef.current?.focus()}
            onSelectField={setMobileFilterField}
          />

          <div className="mt-2.5 hidden grid-cols-2 gap-1.5 md:grid md:grid-cols-4 lg:grid-cols-7">
            <DepartmentFilterButton
              value={filters.department}
              majorShortcuts={userMajorShortcuts}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            />
            <FilterSelect
              label="이수구분 필터"
              value={filters.subjectType}
              active={filters.subjectType !== '전체'}
              onChange={(e) => setFilters(prev => ({ ...prev, subjectType: e.target.value }))}
            >
              {courseTypes.map(type => (
                <option key={type} value={type}>{type === '전체' ? '구분' : type}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="학년 필터"
              value={filters.grade}
              active={filters.grade !== '전체'}
              onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
            >
              {grades.map(grade => (
                <option key={grade} value={grade}>{grade === '전체' ? '학년' : grade}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="학점 필터"
              value={filters.credits}
              active={filters.credits !== '전체'}
              onChange={(e) => setFilters(prev => ({ ...prev, credits: e.target.value }))}
            >
              {creditOptions.map(credit => (
                <option key={credit} value={credit}>{credit === '전체' ? '학점' : credit}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="요일 필터"
              value={filters.dayOfWeek}
              active={filters.dayOfWeek !== '전체'}
              onChange={(e) => {
                const nextDayOfWeek = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  dayOfWeek: nextDayOfWeek,
                  startTime: nextDayOfWeek === UNASSIGNED_TIME_FILTER ? '전체' : prev.startTime,
                  endTime: nextDayOfWeek === UNASSIGNED_TIME_FILTER ? '전체' : prev.endTime
                }));
              }}
            >
              {filterDaysOfWeek.map(day => (
                <option key={day} value={day}>
                  {day === '전체' ? '요일' : day}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="시작 교시 필터"
              value={filters.startTime}
              active={filters.startTime !== '전체'}
              disabled={filters.dayOfWeek === UNASSIGNED_TIME_FILTER}
              onChange={(e) => setFilters(prev => ({ ...prev, startTime: e.target.value }))}
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
              onChange={(e) => setFilters(prev => ({ ...prev, endTime: e.target.value }))}
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time === '전체' ? '종료' : `${time}교시`}</option>
              ))}
            </FilterSelect>
          </div>

          {(activeFilterCount > 0 || searchTerm) && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-ghost h-7 gap-1 px-2 text-xs text-slate-500"
              >
                <RotateCcw size={12} /> 필터 초기화{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </div>
          )}
        </section>

        {/* Main Content Area */}
        <div className={`mt-4 grid-cols-1 gap-4 md:mt-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)] lg:gap-6 ${showMobileSearch ? 'grid' : 'hidden'} md:grid`}>
          {/* Left: Course List */}
          <main>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-slate-900">검색 결과</h2>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-blue-700">
                    {totalElements.toLocaleString()}
                  </span>
                </div>
                {hasResultPagination && (
                  <div className="hidden flex-shrink-0 items-center gap-0.5 md:flex">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!canGoToPreviousPage}
                      aria-label="이전 페이지"
                      className="icon-btn h-10 w-10 disabled:opacity-40 sm:h-7 sm:w-7"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="min-w-[44px] text-center text-xs font-medium tabular-nums text-slate-500">
                      {currentPage + 1}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!canGoToNextPage}
                      aria-label="다음 페이지"
                      className="icon-btn h-10 w-10 disabled:opacity-40 sm:h-7 sm:w-7"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <ul aria-label="검색 결과 불러오는 중" className="course-list">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <CourseRowSkeleton key={index} />
                  ))}
                </ul>
              ) : filteredCourses.length === 0 ? (
                <EmptyResults onReset={handleResetFilters} />
              ) : (
                <ul
                  ref={resultsListRef}
                  className="course-list lg:max-h-[calc(100vh-18rem)] lg:min-h-[420px] lg:overflow-y-auto lg:overscroll-contain"
                >
                  {filteredCourses.map(course => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      onAddToTimetable={handleAddToTimetable}
                      onAddToWishlist={handleAddToWishlist}
                      actionsDisabled={showWishlistModal}
                      showWishlistCountPreview={showWishlistCountPreview}
                      isExpanded={expandedCourseId === course.id}
                      onToggleExpanded={() => setExpandedCourseId(prev => prev === course.id ? null : course.id)}
                    />
                  ))}
                </ul>
              )}

              {/* 모바일 무한 스크롤 sentinel (데스크톱은 md:hidden 이라 페이지네이션 사용) */}
              {currentPage + 1 < totalPages && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-3 md:hidden">
                  {isLoadingMore && <span className="text-xs font-medium text-slate-400">과목 더 불러오는 중…</span>}
                </div>
              )}

              {!isLoading && filteredCourses.length > 0 && (
                <div className="hidden border-t border-slate-100 md:block">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          </main>

          {/* Right: Timetable & Wishlist */}
          <aside className="hidden md:block">
            <div className="space-y-4 lg:sticky lg:top-[4.5rem]">
              {/* Desktop: Mini Timetable */}
              <div className="hidden lg:block">
                <TimetableGrid
                  courses={timetable}
                  onExportImage={handleExportTimetableImage}
                  onRemoveCourse={handleRemoveFromTimetable}
                  onAddToWishlist={handleMoveToWishlistFromTimetable}
                  onViewCourseDetails={handleViewCourseDetails}
                  onClearAll={handleClearAllTimetable}
                  onShowTimetableList={handleShowTimetableList}
                  timetableRef={timetableRef}
                  isExportingImage={isExportingImage}
                />
              </div>

              {/* Wishlist */}
              <div data-tour="wishlist-panel" className="card">
                <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-slate-900">위시리스트</h3>
                      {wishlist.length > 0 && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                          {wishlist.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium tabular-nums text-slate-400">{wishlistCredits}학점</span>
                      <button
                        onClick={() => {
                          setWishlistModalMode('list');
                          setShowWishlistModal(true);
                        }}
                        className="icon-btn h-10 w-10"
                        title="위시리스트 확장 보기"
                        aria-label="위시리스트 확장 보기"
                      >
                        <Maximize size={15} />
                      </button>
                    </div>
                  </div>

                  {/* 목표 학점 선택 */}
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <span className="text-[13px] font-medium text-slate-600">목표 학점</span>
                    <div className="w-[120px]">
                      <FilterSelect
                        value={targetCredits}
                        onChange={(e) => setTargetCredits(parseInt(e.target.value))}
                        active={targetCredits !== 18}
                        label="목표 학점 선택"
                      >
                        {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(credit => (
                          <option key={credit} value={credit}>
                            {credit}학점{credit === 18 ? ' (권장)' : ''}
                          </option>
                        ))}
                      </FilterSelect>
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-3">
                  {wishlist.length > 0 ? (
                    <ul className="space-y-2">
                      {wishlist.map(course => (
                        <li key={course.id} className={`rounded-xl p-3 ring-1 ${course.isRequired ? 'bg-rose-50/70 ring-rose-200' : 'bg-white ring-slate-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-semibold text-slate-900">{course.name}</p>
                                {course.isRequired && (
                                  <span className="flex-shrink-0 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    필수
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">{course.credits}학점 · {course.professor}</p>
                              <label
                                htmlFor={`required-${course.id}`}
                                className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-xs text-slate-600"
                              >
                                <input
                                  type="checkbox"
                                  id={`required-${course.id}`}
                                  checked={course.isRequired || false}
                                  onChange={() => handleToggleRequired(course.id, course.isRequired)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                />
                                필수 포함
                              </label>
                            </div>
                            <button
                              onClick={() => handleRemoveFromWishlist(course.id)}
                              aria-label={`${course.name} 위시리스트에서 제거`}
                              className="icon-btn h-7 w-7 hover:text-rose-500"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-10 text-center">
                      <p className="text-sm font-medium text-slate-600">아직 담은 과목이 없어요</p>
                      <p className="mt-1 text-xs text-slate-400">검색 결과에서 '담기'를 누르면 여기에 모여요.</p>
                    </div>
                  )}
                </div>
                {wishlist.length > 0 && (
                  <div className="border-t border-slate-100 p-3 sm:p-4">
                    <button
                      onClick={() => {
                        setWishlistModalMode('setup');
                        setShowWishlistModal(true);
                      }}
                      disabled={isGenerating}
                      className="btn-primary h-11 w-full rounded-xl text-[15px]"
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          생성 중...
                        </span>
                      ) : (
                        `시간표 조합 만들기 · ${wishlistCredits}학점`
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
        </>
      </div>
      {/* Footer */}
      <footer
        aria-hidden={hasBlockingOverlay}
        inert={hasBlockingOverlay ? '' : undefined}
        className="mt-12 border-t border-slate-200 bg-white"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-white">
              <CalendarDays size={13} />
            </span>
            <span className="font-semibold text-slate-700">INU 시간표</span>
            <span className="text-xs text-slate-400">인천대학교 비공식 서비스 · © 2026</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowNewUserTutorial(true)}
              className="btn-ghost h-8 px-2.5 text-xs text-slate-500"
            >
              <Info size={13} /> 사용법
            </button>
            <button
              type="button"
              onClick={() => setShowDeveloperNotes(true)}
              className="btn-ghost h-8 px-2.5 text-xs text-slate-500"
            >
              <Info size={13} /> 개발 노트
            </button>
            <a
              href="https://www.instagram.com/jjh020426?igsh=eGcxOXllcm16Yzk2&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost h-8 px-2.5 text-xs text-slate-500"
            >
              <MessageSquare size={13} /> 문의하기
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
