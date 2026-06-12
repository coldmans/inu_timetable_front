import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, Plus, Info, ChevronDown, ChevronLeft, ChevronRight, MapPin, Clock, Star, X, ShoppingCart, CalendarDays, AlertTriangle, LogIn, LogOut, Download, Maximize, MessageSquare, Settings, CheckCircle2, XCircle, RotateCcw, SearchX } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import Pagination from './components/Pagination';
import TimetableCombinationResults from './components/TimetableCombinationResults';
import WishlistModal from './components/WishlistModal';
import CourseDetailModal from './components/CourseDetailModal';
import TimetableCourseMenu from './components/TimetableCourseMenu';
import TimetableListModal from './components/TimetableListModal';
import AdminSubjectManager from './components/AdminSubjectManager';

import { subjectAPI, wishlistAPI, timetableAPI, combinationAPI } from './services/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TimetableGrid from './components/TimetableGrid';
import {
  CURRENT_SEMESTER,
  formatCourse,
  getCourseTypeColorScheme,
  parseTime,
  parseTimeString,
  checkConflict,
  departments,
  courseTypes,
  grades,
  filterDaysOfWeek,
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
  if (!isGenerating) return null;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isGenerating) {
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
    }
  }, [isGenerating]);

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

const NewUserTutorialModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      icon: Search,
      title: '과목 찾기',
      description: '과목명, 학과, 이수구분, 요일로 필요한 강의를 빠르게 좁혀보세요.'
    },
    {
      icon: ShoppingCart,
      title: '위시리스트 담기',
      description: '관심 과목은 먼저 담아두고 필수 포함 여부를 체크할 수 있어요.'
    },
    {
      icon: Star,
      title: '조건 맞춰 조합',
      description: '목표 학점과 공강 요일을 고르면 가능한 시간표 조합을 확인할 수 있어요.'
    },
    {
      icon: CalendarDays,
      title: '시간표 적용',
      description: '마음에 드는 조합을 내 시간표에 적용하고 PDF로 저장할 수 있어요.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-user-tutorial-title"
        className="modal-panel w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="border-b border-slate-100 px-5 py-4 md:px-6">
          <h2 id="new-user-tutorial-title" className="text-lg font-bold tracking-tight text-slate-900">
            시간표, 이렇게 만들어요
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            과목을 바로 추가해도 되고, 위시리스트에 모아둔 뒤 조합을 만들 수도 있습니다.
          </p>
        </div>

        <div className="grid gap-2 p-4 md:grid-cols-2 md:p-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;

            return (
              <div key={step.title} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/60">
                    <StepIcon size={17} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold tabular-nums text-blue-600">{index + 1}</span>
                      <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4 md:px-6">
          <button type="button" onClick={onClose} className="btn-primary h-10 px-5">
            과목 검색 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};

// Timetable components moved to components/TimetableGrid.jsx

const formatPeriod = (value) => {
  const rounded = Math.round(value * 2) / 2;
  if (rounded >= 10) return `야${rounded - 9}`;
  return `${rounded}`;
};

const formatScheduleLabel = (course) => {
  const times = course.schedules ? parseTime(course.schedules) : parseTimeString(course.time);
  if (!times || times.length === 0) return course.time ? course.time : '시간 미정';
  return times.map(t => `${t.day} ${formatPeriod(t.start)}~${formatPeriod(t.end)}교시`).join(' · ');
};

const CourseRow = ({ course, onAddToTimetable, onAddToWishlist, actionsDisabled = false }) => (
  <li className="px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:px-5">
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`inline-flex flex-shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${course.color} ${course.textColor}`}>
            {course.type}
          </span>
          <h3 className="min-w-0 truncate text-[15px] font-semibold text-slate-900" title={course.name}>
            {course.name}
          </h3>
          <span className="flex-shrink-0 text-xs font-medium text-slate-400">{course.credits}학점</span>
        </div>
        <p className="mt-1 truncate text-[13px] text-slate-500">
          {course.professor} · {course.department}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
          <Clock size={12} className="flex-shrink-0 text-slate-400" />
          <span className="truncate font-medium">{formatScheduleLabel(course)}</span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:ml-3">
        <a
          href={`https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${course.name} 강의평 보기`}
          title="에브리타임 강의평"
          className="icon-btn"
        >
          <MessageSquare size={15} />
        </a>
        <button
          type="button"
          onClick={() => onAddToWishlist(course)}
          disabled={actionsDisabled}
          className="btn-secondary h-8 flex-1 px-3 text-[13px] sm:flex-none"
        >
          <ShoppingCart size={13} /> 담기
        </button>
        <button
          type="button"
          onClick={() => onAddToTimetable(course)}
          disabled={actionsDisabled}
          className="btn-primary h-8 flex-1 px-3 text-[13px] sm:flex-none"
        >
          <Plus size={13} /> 추가
        </button>
      </div>
    </div>
  </li>
);

const CourseRowSkeleton = () => (
  <li className="animate-pulse px-4 py-3.5 sm:px-5">
    <div className="flex items-center gap-2">
      <div className="h-4 w-9 rounded-md bg-slate-100" />
      <div className="h-4 w-44 rounded-md bg-slate-200" />
      <div className="h-3 w-10 rounded-md bg-slate-100" />
    </div>
    <div className="mt-2 h-3 w-36 rounded-md bg-slate-100" />
    <div className="mt-2 h-3 w-28 rounded-md bg-slate-100" />
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

const FilterSelect = ({ value, onChange, active, label, children }) => (
  <div className="relative">
    <select
      aria-label={label}
      value={value}
      onChange={onChange}
      className={`field appearance-none pr-8 text-[13px] ${active ? 'border-blue-200 bg-blue-50/70 font-medium text-blue-700' : 'text-slate-600'}`}
    >
      {children}
    </select>
    <ChevronDown
      size={14}
      className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${active ? 'text-blue-500' : 'text-slate-400'}`}
    />
  </div>
);

// 메인 애플리케이션 컴포넌트
function AppContent() {
  const { user, isLoggedIn, isLoading: authLoading, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' });

  // 페이지 상태 관리
  const [currentView, setCurrentView] = useState('timetable'); // 'login' | 'portal' | 'timetable'

  /* New State for Wishlist Modal Mode */
  const [wishlistModalMode, setWishlistModalMode] = useState('list'); // 'list' | 'setup'

  // 상태 관리
  const [courses, setCourses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState(null);
  const [showTimetableListModal, setShowTimetableListModal] = useState(false);

  const timetableRef = useRef(null);
  const lastClickRefs = useRef({}); // { [courseId]: timestamp }
  const [isExportingPDF, setIsExportingPDF] = useState(false);


  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(20); // 페이지당 20개 항목

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewUserTutorial, setShowNewUserTutorial] = useState(false);

  // 시간표 조합 결과
  const [combinationResults, setCombinationResults] = useState(null);
  const [showCombinationResults, setShowCombinationResults] = useState(false);

  // 목표 학점 설정
  const [targetCredits, setTargetCredits] = useState(18);

  // 희망 공강 요일 설정
  const [freeDays, setFreeDays] = useState([]);
  const wishlistCredits = wishlist.reduce((acc, c) => acc + c.credits, 0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  }, []);





  // 과목 검색 및 로드
  useEffect(() => {
    loadCourses();
  }, []);

  // 사용자 데이터 로드 - 인증 로딩 완료 후 실행
  useEffect(() => {
    console.log('useEffect 실행 - authLoading:', authLoading, 'user:', user);
    if (!authLoading && user) {
      console.log('✅ 조건 만족, loadUserData 호출');
      loadUserData();
    }
  }, [user, authLoading]);



  const loadCourses = async (page = 0) => {
    try {
      setIsLoading(true);
      // 학년 필터 변환 ("1학년" -> 1, "전체" -> undefined)
      const gradeFilter = filters.grade === '전체' ? undefined :
        parseInt(filters.grade.replace('학년', ''));

      const response = await subjectAPI.filter({
        subjectName: searchTerm,
        department: filters.department,
        subjectType: filters.subjectType,
        grade: gradeFilter,
        credits: filters.credits === '전체' ? undefined : parseInt(filters.credits.replace('학점', '')),
        dayOfWeek: filters.dayOfWeek === '전체' ? undefined : filters.dayOfWeek,
        startTime: filters.startTime === '전체' ? undefined : filters.startTime,
        endTime: filters.endTime === '전체' ? undefined : filters.endTime
      }, page, pageSize);

      // 페이징 응답 처리
      console.log('📥 API 응답 데이터:', response);

      if (response.content) {
        // 백엔드에서 페이징 응답이 온 경우
        console.log(`✅ 페이징 응답: ${response.content.length}개 항목, 총 ${response.totalElements}개 중 ${response.number + 1}/${response.totalPages} 페이지`);
        const formattedCourses = response.content.map((subject, index) => formatCourse(subject, index));
        setCourses(formattedCourses);
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
        setCurrentPage(response.number || 0);
      } else {
        // 기존 배열 응답 (백엔드 미수정 시 호환성)
        console.log(`배열 응답: ${response.length}개 항목 (페이징 미적용)`);
        const formattedCourses = response.map((subject, index) => formatCourse(subject, index));
        setCourses(formattedCourses);
        setTotalPages(1);
        setTotalElements(formattedCourses.length);
        setCurrentPage(0);
      }
    } catch (error) {
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
      setCourses(formattedCourses);
      setTotalPages(Math.ceil(mockData.length / pageSize));
      setTotalElements(mockData.length);
      setCurrentPage(page);
    } finally {
      setIsLoading(false);
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
  };

  const defaultFilters = { department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' };
  const activeFilterCount = Object.values(filters).filter(value => value !== '전체').length;

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

  // 페이징이 적용되었으므로 클라이언트 필터링 제거 (서버에서 처리)
  const filteredCourses = courses;

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadCourses(newPage);
    // 페이지 변경 시 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportTimetablePDF = async () => {
    if (!timetable || timetable.length === 0) {
      showToast('시간표에 과목을 먼저 담아주세요.', 'warning');
      return;
    }

    if (!timetableRef.current) {
      showToast('시간표 화면을 찾을 수 없어요.', 'warning');
      return;
    }

    try {
      setIsExportingPDF(true);
      const canvas = await html2canvas(timetableRef.current, {
        scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const aspectRatio = canvas.width / canvas.height;

      let renderWidth = pageWidth - 20;
      let renderHeight = renderWidth / aspectRatio;

      if (renderHeight > pageHeight - 20) {
        renderHeight = pageHeight - 20;
        renderWidth = renderHeight * aspectRatio;
      }

      const offsetX = (pageWidth - renderWidth) / 2;
      const offsetY = (pageHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight);
      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`inu-timetable-${today}.pdf`);
      showToast('시간표를 PDF로 저장했어요!');
    } catch (error) {
      console.error('시간표 PDF 저장 실패:', error);
      showToast('PDF 저장에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsExportingPDF(false);
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

    // 프론트 중복/충돌 검사 및 Optimistic UI 업데이트 제거
    try {
      await timetableAPI.add({
        userId: user.id,
        subjectId: courseToAdd.id,
        semester: CURRENT_SEMESTER,
        memo: ''
      });
      // 서버에서 최신 시간표 데이터를 다시 불러와서 동기화
      const timetableData = await timetableAPI.getByUser(user.id, CURRENT_SEMESTER);
      const formattedTimetable = timetableData.map((item, index) => formatCourse(item.subject, index));
      setTimetable(formattedTimetable);
      showToast(`'${courseToAdd.name}' 과목을 시간표에 추가했어요!`);
    } catch (error) {
      // 에러 메시지 처리
      if (error.message.includes('시간') || error.message.includes('충돌') || error.message.includes('겹치')) {
        showToast(`'${courseToAdd.name}' 과목은 기존 시간표와 시간이 겹쳐요! (서버 검사)`, 'warning');
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
      showToast('시간표 적용 중 오류가 발생했습니다.', 'warning');
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout();
    setWishlist([]);
    setTimetable([]);
    // 필터 초기화
    setFilters({ department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' });
    showToast('로그아웃되었습니다.');
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
    return (
      <div className="min-h-screen bg-slate-50">
        <Toast {...toast} onDismiss={() => setToast(prev => ({ ...prev, show: false }))} />
        <div className="max-w-7xl mx-auto px-3 py-4 md:px-8 md:py-10">
          <header className="mb-4 md:mb-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-4xl font-bold tracking-tight text-slate-900">과목 관리</h1>
                <p className="mt-1 text-sm md:text-base text-slate-500">관리자 전용 과목 데이터 관리 페이지입니다.</p>
              </div>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                과목 검색으로 돌아가기
              </a>
            </div>
          </header>
          <AdminSubjectManager showToast={showToast} />
        </div>
      </div>
    );
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
      <NewUserTutorialModal
        isOpen={showNewUserTutorial}
        onClose={() => setShowNewUserTutorial(false)}
      />
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
        onExportPDF={handleExportTimetablePDF}
      />

      {showCombinationResults && combinationResults && (
        <TimetableCombinationResults
          results={combinationResults}
          onClose={() => setShowCombinationResults(false)}
          onSelectCombination={handleSelectCombination}
        />
      )}

      <header
        aria-hidden={showWishlistModal || showNewUserTutorial}
        inert={showWishlistModal || showNewUserTutorial ? '' : undefined}
        className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm">
              <CalendarDays size={17} />
            </span>
            <span className="truncate text-[15px] font-bold tracking-tight text-slate-900">INU 시간표</span>
            <span className="hidden flex-shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
              {CURRENT_SEMESTER.replace('-', '년 ')}학기
            </span>
          </a>
          <div className="flex flex-shrink-0 items-center gap-2">
            {isLoggedIn ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-[13px] font-semibold leading-tight text-slate-900">{user.nickname}님</p>
                  <p className="text-[11px] leading-tight text-slate-500">{user.major} {user.grade}학년</p>
                </div>
                <button onClick={handleLogout} className="btn-ghost h-8 px-2.5 text-[13px]">
                  <LogOut size={14} /> 로그아웃
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="btn-primary h-8 px-3 text-[13px]">
                <LogIn size={14} /> 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        aria-hidden={showWishlistModal || showNewUserTutorial}
        inert={showWishlistModal || showNewUserTutorial ? '' : undefined}
        className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-6"
      >

        {/* 검색 바 */}
        <section aria-label="과목 검색" className="card p-3 md:p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
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

          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
            <FilterSelect
              label="학과 필터"
              value={filters.department}
              active={filters.department !== '전체'}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept === '전체' ? '학과' : dept}</option>
              ))}
            </FilterSelect>
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
              onChange={(e) => setFilters(prev => ({ ...prev, dayOfWeek: e.target.value }))}
            >
              {filterDaysOfWeek.map(day => (
                <option key={day} value={day}>{day === '전체' ? '요일' : day}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="시작 교시 필터"
              value={filters.startTime}
              active={filters.startTime !== '전체'}
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
        <div className="mt-4 grid grid-cols-1 gap-4 md:mt-5 lg:grid-cols-3 lg:gap-6">
          {/* Left: Course List */}
          <main className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-slate-900">검색 결과</h2>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-blue-700">
                    {totalElements.toLocaleString()}
                  </span>
                </div>
                {hasResultPagination && (
                  <div className="flex flex-shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!canGoToPreviousPage}
                      aria-label="이전 페이지"
                      className="icon-btn h-7 w-7 disabled:opacity-40"
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
                      className="icon-btn h-7 w-7 disabled:opacity-40"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <ul aria-label="검색 결과 불러오는 중" className="divide-y divide-slate-100">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <CourseRowSkeleton key={index} />
                  ))}
                </ul>
              ) : filteredCourses.length === 0 ? (
                <EmptyResults onReset={handleResetFilters} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredCourses.map(course => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      onAddToTimetable={handleAddToTimetable}
                      onAddToWishlist={handleAddToWishlist}
                      actionsDisabled={showWishlistModal || showNewUserTutorial}
                    />
                  ))}
                </ul>
              )}

              {!isLoading && filteredCourses.length > 0 && (
                <div className="border-t border-slate-100">
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
          <aside>
            <div className="space-y-4 lg:sticky lg:top-[4.5rem]">
              {/* Desktop: Mini Timetable */}
              <div className="hidden lg:block">
                <TimetableGrid
                  courses={timetable}
                  onExportPDF={handleExportTimetablePDF}
                  onRemoveCourse={handleRemoveFromTimetable}
                  onAddToWishlist={handleMoveToWishlistFromTimetable}
                  onViewCourseDetails={handleViewCourseDetails}
                  onClearAll={handleClearAllTimetable}
                  onShowTimetableList={handleShowTimetableList}
                  timetableRef={timetableRef}
                  isExportingPDF={isExportingPDF}
                />
              </div>

              {/* Wishlist */}
              <div className="card">
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
                        className="icon-btn"
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
                    <div className="relative">
                      <select
                        value={targetCredits}
                        onChange={(e) => setTargetCredits(parseInt(e.target.value))}
                        aria-label="목표 학점 선택"
                        className="field h-8 w-[120px] appearance-none pr-7 text-[13px]"
                      >
                        {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(credit => (
                          <option key={credit} value={credit}>
                            {credit}학점{credit === 18 ? ' (권장)' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
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
      </div>

      {/* Mobile: Floating Button to View Timetable */}
      <div className="fixed bottom-5 right-4 z-40 lg:hidden">
        <button
          onClick={handleShowTimetableList}
          className="flex h-12 items-center gap-2 rounded-full bg-blue-600 pl-4 pr-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
        >
          <CalendarDays size={18} />
          내 시간표
          {timetable.length > 0 && (
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-white/25 px-1 text-xs font-bold tabular-nums">
              {timetable.length}
            </span>
          )}
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-white">
              <CalendarDays size={13} />
            </span>
            <span className="font-semibold text-slate-700">INU 시간표</span>
            <span className="text-xs text-slate-400">인천대학교 비공식 서비스 · © 2026</span>
          </div>
          <div className="flex items-center gap-1">
            <a href="/admin/subjects" className="btn-ghost h-8 px-2.5 text-xs text-slate-500">
              <Settings size={13} /> 과목 관리
            </a>
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
