import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, Plus, Info, ChevronDown, ChevronLeft, ChevronRight, MapPin, Clock, Star, X, ShoppingCart, CalendarDays, AlertTriangle, LogIn, LogOut, Download, Maximize, MessageSquare, Settings } from 'lucide-react';
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

const Toast = ({ message, show, type, onDismiss }) => {
  const getToastStyles = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div
      className={`fixed top-5 right-5 flex items-center text-white px-6 py-3 rounded-lg shadow-lg transition-transform duration-300 z-50 ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${getToastStyles()}`}
    >
      {(type === 'warning' || type === 'error') && <AlertTriangle className="mr-2" />}
      {message}
      <button onClick={onDismiss} className="ml-4 font-bold">X</button>
    </div>
  );
};

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
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/60 px-8 py-6 shadow-lg">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-user-tutorial-title"
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="border-b border-slate-200 px-5 py-4 md:px-6">
          <p className="text-xs font-semibold text-blue-600">처음 시작 가이드</p>
          <h2 id="new-user-tutorial-title" className="mt-1 text-xl font-bold text-slate-900">
            시간표를 만드는 기본 흐름이에요
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            과목을 바로 추가해도 되고, 위시리스트에 모아둔 뒤 조합을 만들 수도 있습니다.
          </p>
        </div>

        <div className="grid gap-2 p-4 md:grid-cols-2 md:p-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;

            return (
              <div key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                    <StepIcon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                      <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            과목 검색 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};

// Timetable components moved to components/TimetableGrid.jsx

const CourseCard = ({ course, onAddToTimetable, onAddToWishlist, actionsDisabled = false }) => (
  <div className="group flex h-full overflow-hidden rounded-lg md:rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
    <div className="flex min-w-0 flex-1 flex-col p-2.5 md:p-4">
      <div className="mb-1.5 flex items-start justify-between gap-1.5 md:mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-slate-900 break-words [overflow-wrap:anywhere] md:text-base" title={course.name}>
            {course.name}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400 md:text-xs">{course.credits}학점</p>
        </div>
        <div className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] md:px-2 md:text-[11px] font-medium whitespace-nowrap ${course.color} ${course.textColor}`}>
          {course.type}
        </div>
      </div>

      <div className="flex-1 space-y-1 text-[10px] text-slate-600 md:space-y-1.5 md:text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin size={11} className="flex-shrink-0 text-slate-400" />
          <span className="truncate">{course.department} | {course.professor}</span>
        </div>
        <div className="flex min-w-0 items-start gap-1 rounded-md bg-slate-50 px-1.5 py-1 text-slate-600 md:px-2 md:py-1.5">
          <Clock size={11} className="mt-0.5 flex-shrink-0 text-slate-400" />
          <span className="leading-snug">{course.time || '시간 미정'}</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 md:mt-3 md:gap-1.5 md:pt-3">
        <a
          href={`https://everytime.kr/lecture/search?keyword=${encodeURIComponent(course.name)}&condition=name`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${course.name} 강의평 보기`}
          title="강의평"
          className="inline-flex min-h-[27px] min-w-0 items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap rounded-md bg-green-100 px-1 py-0.5 text-[9px] font-medium text-green-700 transition-colors hover:bg-green-200 md:min-h-[31px] md:gap-1 md:px-2 md:text-[11px]"
        >
          <MessageSquare size={10} className="flex-shrink-0 md:h-3 md:w-3" />
          <span className="hidden whitespace-nowrap sm:inline">강의평</span>
        </a>
        <button
          type="button"
          onClick={() => onAddToWishlist(course)}
          disabled={actionsDisabled}
          aria-disabled={actionsDisabled}
          className="inline-flex min-h-[27px] min-w-0 items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap rounded-md bg-slate-100 px-1 py-0.5 text-[9px] font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-100 md:min-h-[31px] md:gap-1 md:px-2 md:text-[11px]"
        >
          <ShoppingCart size={10} className="flex-shrink-0 md:h-3 md:w-3" />
          <span className="whitespace-nowrap">담기</span>
        </button>
        <button
          type="button"
          onClick={() => onAddToTimetable(course)}
          disabled={actionsDisabled}
          aria-disabled={actionsDisabled}
          className="inline-flex min-h-[27px] min-w-0 items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap rounded-md bg-blue-600 px-1 py-0.5 text-[9px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none disabled:hover:bg-blue-300 md:min-h-[31px] md:gap-1 md:px-2 md:text-[11px]"
        >
          <Plus size={10} className="flex-shrink-0 md:h-3 md:w-3" />
          <span className="whitespace-nowrap">추가</span>
        </button>
      </div>
    </div>
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

      const formattedWishlist = wishlistData.map((item, index) => {
        console.log('위시리스트 아이템:', item);

        // 색상 배열 (formatCourse에서 가져옴)
        const colors = [
          { color: 'bg-blue-200', textColor: 'text-blue-800', borderColor: 'border-blue-400' },
          { color: 'bg-green-200', textColor: 'text-green-800', borderColor: 'border-green-400' },
          { color: 'bg-indigo-200', textColor: 'text-indigo-800', borderColor: 'border-indigo-400' },
          { color: 'bg-yellow-200', textColor: 'text-yellow-800', borderColor: 'border-yellow-400' },
          { color: 'bg-purple-200', textColor: 'text-purple-800', borderColor: 'border-purple-400' },
          { color: 'bg-pink-200', textColor: 'text-pink-800', borderColor: 'border-pink-400' },
          { color: 'bg-teal-200', textColor: 'text-teal-800', borderColor: 'border-teal-400' },
          { color: 'bg-sky-200', textColor: 'text-sky-800', borderColor: 'border-sky-400' },
          { color: 'bg-red-200', textColor: 'text-red-800', borderColor: 'border-red-400' },
          { color: 'bg-orange-200', textColor: 'text-orange-800', borderColor: 'border-orange-400' },
        ];

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
          ...colors[index % colors.length]
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

      // 위시리스트에 추가
      const colors = [
        { color: 'bg-blue-200', textColor: 'text-blue-800', borderColor: 'border-blue-400' },
        { color: 'bg-green-200', textColor: 'text-green-800', borderColor: 'border-green-400' },
        { color: 'bg-indigo-200', textColor: 'text-indigo-800', borderColor: 'border-indigo-400' },
        { color: 'bg-yellow-200', textColor: 'text-yellow-800', borderColor: 'border-yellow-400' },
        { color: 'bg-purple-200', textColor: 'text-purple-800', borderColor: 'border-purple-400' },
      ];
      const colorScheme = colors[wishlist.length % colors.length];

      setWishlist([...wishlist, { ...course, ...colorScheme, isRequired: false }]);
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
      <div className="bg-[#f6f7fb] min-h-screen font-sans">
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
    <div className="bg-[#f6f7fb] min-h-screen font-sans">
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

      <div
        aria-hidden={showWishlistModal || showNewUserTutorial}
        inert={showWishlistModal || showNewUserTutorial ? '' : undefined}
        className="max-w-7xl mx-auto px-3 py-3 md:px-8 md:py-6"
      >

        <header className="mb-3 md:mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm sm:flex">
                <Search size={18} />
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 md:text-2xl">과목 검색</h1>
            </div>
            <div className="flex-shrink-0">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-slate-900">{user.nickname}님</p>
                    <p className="text-xs text-slate-500">{user.major} {user.grade}학년</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 md:px-4 md:text-sm"
                  >
                    <LogOut size={14} /> <span className="hidden md:inline">로그아웃</span><span className="md:hidden">로그아웃</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 md:px-4 md:text-sm"
                >
                  <LogIn size={14} /> 로그인
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 검색 바 */}
        <div className="mb-3 md:mb-8 rounded-lg md:rounded-2xl border border-slate-200 bg-white p-3 md:p-5 shadow-sm space-y-3">
          {/* 검색 입력 */}
          <div className="flex gap-1.5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 md:left-4 md:top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                aria-label="과목명 검색"
                placeholder="과목명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full rounded-lg md:rounded-xl border border-slate-200 bg-white px-9 py-2 md:px-12 md:py-3 text-sm text-slate-900 shadow-inner shadow-transparent focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={executeSearch}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg md:rounded-xl bg-blue-600 px-3 py-2 md:px-5 md:py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Search size={16} className="md:hidden" />
              <span className="hidden md:inline">검색</span>
              <span className="md:hidden">검색</span>
            </button>
          </div>
          {/* 필터 */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 md:gap-2">
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.department === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {departments.map(dept => (
                <option key={dept} value={dept} className="text-slate-700">{dept === '전체' ? '학과' : dept}</option>
              ))}
            </select>
            <select
              value={filters.subjectType}
              onChange={(e) => setFilters(prev => ({ ...prev, subjectType: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.subjectType === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {courseTypes.map(type => (
                <option key={type} value={type} className="text-slate-700">{type === '전체' ? '구분' : type}</option>
              ))}
            </select>
            <select
              value={filters.grade}
              onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.grade === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {grades.map(grade => (
                <option key={grade} value={grade} className="text-slate-700">{grade === '전체' ? '학년' : grade}</option>
              ))}
            </select>
            <select
              value={filters.credits}
              onChange={(e) => setFilters(prev => ({ ...prev, credits: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.credits === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {creditOptions.map(credit => (
                <option key={credit} value={credit} className="text-slate-700">{credit === '전체' ? '학점' : credit}</option>
              ))}
            </select>
            <select
              value={filters.dayOfWeek}
              onChange={(e) => setFilters(prev => ({ ...prev, dayOfWeek: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.dayOfWeek === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {filterDaysOfWeek.map(day => (
                <option key={day} value={day} className="text-slate-700">{day === '전체' ? '요일' : day}</option>
              ))}
            </select>
            <select
              value={filters.startTime}
              onChange={(e) => setFilters(prev => ({ ...prev, startTime: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.startTime === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {timeOptions.map(time => (
                <option key={time} value={time} className="text-slate-700">
                  {time === '전체' ? '시작' : `${time}교시`}
                </option>
              ))}
            </select>
            <select
              value={filters.endTime}
              onChange={(e) => setFilters(prev => ({ ...prev, endTime: e.target.value }))}
              className={`w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${filters.endTime === '전체' ? 'text-slate-400' : 'text-slate-700'}`}
            >
              {timeOptions.map(time => (
                <option key={time} value={time} className="text-slate-700">
                  {time === '전체' ? '종료' : `${time}교시`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-5 md:gap-8 lg:grid-cols-3 lg:gap-10">
          {/* Left: Course List */}
          <main className="lg:col-span-2">
            <div className="mb-2 md:mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">검색 결과</h2>
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  총 {totalElements.toLocaleString()}개
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isLoading && (
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    로딩 중...
                  </div>
                )}
                {hasResultPagination && (
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!canGoToPreviousPage}
                      aria-label="이전 페이지"
                      title="이전 페이지"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="hidden min-w-[52px] text-center text-xs font-semibold text-slate-500 sm:inline">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!canGoToNextPage}
                      aria-label="다음 페이지"
                      title="다음 페이지"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-3">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onAddToTimetable={handleAddToTimetable}
                  onAddToWishlist={handleAddToWishlist}
                  actionsDisabled={showWishlistModal || showNewUserTutorial}
                />
              ))}
            </div>

            {/* 페이징 컴포넌트 */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </main>

          {/* Right: Timetable & Wishlist */}
          <aside className="space-y-8">
            <div className="sticky top-28">
              {/* Desktop: Mini Timetable */}
              <div className="hidden lg:block">
                {/* Timetable Grid */}
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
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">위시리스트</h3>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-slate-500">
                        총 {wishlistCredits}학점
                      </div>
                      <button
                        onClick={() => {
                          setWishlistModalMode('list');
                          setShowWishlistModal(true);
                        }}
                        className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                        title="위시리스트 확장 보기"
                      >
                        <Maximize size={18} className="text-slate-500" />
                      </button>
                    </div>
                  </div>

                  {/* 목표 학점 선택 */}
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">목표 학점</span>
                    <select
                      value={targetCredits}
                      onChange={(e) => setTargetCredits(parseInt(e.target.value))}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={12}>12학점</option>
                      <option value={13}>13학점</option>
                      <option value={14}>14학점</option>
                      <option value={15}>15학점</option>
                      <option value={16}>16학점</option>
                      <option value={17}>17학점</option>
                      <option value={18}>18학점 (권장)</option>
                      <option value={19}>19학점</option>
                      <option value={20}>20학점</option>
                      <option value={21}>21학점</option>
                      <option value={22}>22학점</option>
                      <option value={23}>23학점</option>
                      <option value={24}>24학점</option>
                    </select>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-3">
                  {wishlist.length > 0 ? (
                    <ul className="space-y-3">
                      {wishlist.map(course => (
                        <li key={course.id} className={`rounded-xl border p-3 ${course.isRequired ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-slate-900">{course.name}</p>
                                {course.isRequired && (
                                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                                    필수
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{course.credits}학점 | {course.professor}</p>


                              {/* 필수 과목 체크박스 */}
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`required-${course.id}`}
                                  checked={course.isRequired || false}
                                  onChange={() => handleToggleRequired(course.id, course.isRequired)}
                                  className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                />
                                <label
                                  htmlFor={`required-${course.id}`}
                                  className="cursor-pointer text-sm text-slate-600"
                                >
                                  필수 포함 과목
                                </label>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveFromWishlist(course.id)}
                              className="ml-2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <div className="py-8 text-center text-sm text-slate-400">담은 과목이 없어요.</div>}
                </div>
                {wishlist.length > 0 && (
                  <div className="border-t border-slate-200 p-5">
                    <div className="space-y-2">
                      <div className="text-center text-xs text-slate-500">
                        {wishlist.length}개 과목 • 총 {wishlistCredits}학점
                      </div>
                      <button
                        onClick={() => {
                          setWishlistModalMode('setup');
                          setShowWishlistModal(true);
                        }}
                        disabled={isGenerating}
                        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isGenerating ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            생성 중...
                          </span>
                        ) : (
                          `${wishlistCredits}학점 조합 만들기`
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile: Floating Button to View Timetable */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={handleShowTimetableList}
          className="bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
        >
          <CalendarDays size={20} />
          <span>내 시간표 보기 ({timetable.length})</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              <p>© 2026 INU 시간표. 인천대학교 비공식 서비스입니다.</p>

            </div>
            <div className="flex items-center gap-6">
              <a
                href="/admin/subjects"
                className="text-sm hover:text-white transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                <span>과목 관리</span>
              </a>
              <a
                href="https://www.instagram.com/jjh020426?igsh=eGcxOXllcm16Yzk2&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition-colors flex items-center gap-2"
              >
                <span>📷</span>
                <span>Instagram DM 문의</span>
              </a>
            </div>
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
