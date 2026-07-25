import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Info, ChevronLeft, ChevronRight, Star, X, ShoppingCart, CalendarDays, LogIn, Maximize, MessageSquare, RotateCcw, UserCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import Pagination from './components/Pagination';
import TimetableCombinationResults from './components/TimetableCombinationResults';
import WishlistModal from './components/WishlistModal';
import CourseDetailModal from './components/CourseDetailModal';
import TimetableListModal from './components/TimetableListModal';
import TimetableExportView from './components/TimetableExportView';
import AccountModal from './components/AccountModal';
import { CourseRow, CourseRowSkeleton, EmptyResults, ErrorResults } from './components/CourseRow';
import DepartmentFilterButton from './components/DepartmentFilterButton';
import DeveloperNotesModal from './components/DeveloperNotesModal';
import FilterSelect from './components/FilterSelect';
import HiddenPage from './components/HiddenPage';
import MobileFilterScroller from './components/MobileFilterScroller';
import MobileFilterSheet from './components/MobileFilterSheet';
import MobileSearchSheet from './components/MobileSearchSheet';
import MobileSingleFilterSheet from './components/MobileSingleFilterSheet';
import NewUserTutorial from './components/NewUserTutorial';
import { LoadingOverlay, Toast } from './components/Toast';
import { portalRegisteredCourses } from './components/portalMockData';
import useBodyScrollLock from './hooks/useBodyScrollLock';
import { trackEvent } from './services/analytics';

import { subjectAPI, wishlistAPI, timetableAPI, combinationAPI } from './services/api';
// html2canvas는 이미지 저장 시점에 동적 import 한다(초기 번들에서 제외).
import TimetableGrid from './components/TimetableGrid';
import {
  CURRENT_SEMESTER,
  formatCourse,
  getCourseTypeColorScheme,
  checkConflict,
  getDepartmentFilterParams,
  courseTypes,
  grades,
  filterDaysOfWeek,
  UNASSIGNED_TIME_FILTER,
  timeOptions,
  creditOptions
} from './utils/timetableUtils';

const debugLog = (...args) => {
  if (import.meta.env.DEV) {
    console.debug(...args);
  }
};

// 관리자 화면은 개발 모드 전용(보안: ee05703 에서 공개 앱 숨김 처리).
// 프로덕션 빌드에서는 import.meta.env.DEV 가 false 로 치환되어 아래 동적 import 가
// 데드코드로 제거되므로, admin 코드는 공개 번들에 포함되지 않는다.
const AdminSubjectManager = import.meta.env.DEV
  ? React.lazy(() => import('./components/AdminSubjectManager'))
  : null;


// Helpers and Constants moved to utils/timetableUtils.js

// More constants moved to utils/timetableUtils.js


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
  const [showMobileSearch, setShowMobileSearch] = useState(false); // 모바일: 첫 화면은 시간표만, 검색 버튼으로 검색/과목 리스트 표시
  const [searchField, setSearchField] = useState('subjectName'); // 검색 대상: subjectName | professor | courseCode
  const [showSearchSheet, setShowSearchSheet] = useState(false); // 모바일 검색어 입력 시트
  const coursesRef = useRef([]); // 투어 준비 콜백이 최신 목록을 의존성 없이 읽기 위한 참조
  const mobileTimetableViewportRef = useRef(null); // 모바일 시간표 내부 스크롤 컨테이너
  const toastTimerRef = useRef(null);
  const [mobileFilterField, setMobileFilterField] = useState(null); // 모바일: 단일 필터 시트로 열 필드(null이면 닫힘)
  const [timetable, setTimetable] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // 무한 스크롤 추가 로드(누적) 전용 — 첫 로드/재검색과 분리
  const [courseLoadError, setCourseLoadError] = useState(false);

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
  // boolean 대신 실행 카운터: 투어가 비정상 종료돼 상태가 남아도 버튼을 다시 누르면
  // runId 가 증가해 이펙트가 재실행되므로 언제든 다시 시작할 수 있다.
  const [tutorialRunId, setTutorialRunId] = useState(0);
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
    // 연속 호출 시 이전 타이머가 새 토스트를 조기에 닫지 않도록 정리한다.
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  }, []);

  const closeNewUserTutorial = useCallback(() => {
    setTutorialRunId(0);
  }, []);

  // iOS WebKit 은 방금 스크롤 가능해진 요소를 첫 터치 전까지 제스처 대상으로
  // 등록하지 않는 경우가 있어, 검색이 열리면 1px 스크롤 킥으로 강제 등록한다.
  useEffect(() => {
    if (!showMobileSearch) return;
    requestAnimationFrame(() => {
      const container = mobileTimetableViewportRef.current;
      if (!container || container.scrollHeight <= container.clientHeight) return;
      const original = container.scrollTop;
      container.scrollTop = original + 1;
      container.scrollTop = original;
    });
  }, [showMobileSearch]);

  // 모바일 시간표(내부 스크롤)에서 방금 추가한 과목의 시간대가 보이도록 스크롤한다.
  const scrollMobileTimetableToCourse = useCallback((courseName) => {
    requestAnimationFrame(() => {
      const container = mobileTimetableViewportRef.current;
      if (!container || container.scrollHeight <= container.clientHeight) return;
      const cell = container.querySelector(`[title="${CSS.escape(courseName)}"]`);
      if (!cell) return;
      const containerRect = container.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      container.scrollTo({
        top: container.scrollTop + (cellRect.top - containerRect.top)
          - container.clientHeight / 2 + cellRect.height / 2,
        behavior: 'smooth',
      });
    });
  }, []);

  const prepareTutorialTargets = useCallback(() => {
    // 모바일(데스크톱 액션 버튼이 숨겨지는 폭)에서는 검색 패널을 열고 첫 과목 카드를 펼쳐
    // 투어가 하이라이트할 버튼들이 실제 화면에 보이게 만든다.
    if (window.matchMedia('(min-width: 640px)').matches) return;
    setShowMobileSearch(true);
    setExpandedCourseId(prev => prev ?? (coursesRef.current[0]?.id ?? null));
  }, []);





  // 사용자 데이터 로드 - 인증 로딩 완료 후 실행
  useEffect(() => {
    debugLog('useEffect 실행 - authLoading:', authLoading, 'user:', user);
    if (!authLoading && user) {
      debugLog('✅ 조건 만족, loadUserData 호출');
      loadUserData();
    }
    // loadUserData 는 렌더마다 새로 만들어지는 함수라 deps 에 넣으면 무한 재실행된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);



  const loadCourses = async (page = 0, append = false, searchOverrides = null) => {
    const requestSeq = courseRequestSeqRef.current + 1;
    courseRequestSeqRef.current = requestSeq;
    const isLatestRequest = () => requestSeq === courseRequestSeqRef.current;

    try {
      // append(무한 스크롤 다음 페이지)일 때는 전체 리스트를 스켈레톤으로 교체하지 않도록 별도 플래그를 쓴다.
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setCourseLoadError(false);
      }
      // 학년 필터 변환 ("1학년" -> 1, "전체" -> undefined)
      const gradeFilter = filters.grade === '전체' ? undefined :
        parseInt(filters.grade.replace('학년', ''));
      const isUnassignedTimeFilter = filters.dayOfWeek === UNASSIGNED_TIME_FILTER;
      const departmentFilterParams = getDepartmentFilterParams(filters.department);

      const effectiveTerm = searchOverrides?.searchTerm ?? searchTerm;
      const effectiveField = searchOverrides?.searchField ?? searchField;
      const response = await subjectAPI.filter({
        semester: CURRENT_SEMESTER,
        subjectName: effectiveField === 'subjectName' ? effectiveTerm : undefined,
        professor: effectiveField === 'professor' ? effectiveTerm : undefined,
        courseCode: effectiveField === 'courseCode' ? effectiveTerm : undefined,
        ...departmentFilterParams,
        subjectType: filters.subjectType,
        grade: gradeFilter,
        credits: filters.credits === '전체' ? undefined : parseInt(filters.credits.replace('학점', '')),
        timeBlocks: !isUnassignedTimeFilter && Object.keys(filters.timeBlocks || {}).length > 0
          ? Object.entries(filters.timeBlocks).map(([day, [startHour, endHour]]) => `${day}:${startHour - 8}-${endHour - 8}`)
          : undefined,
        dayOfWeek: filters.dayOfWeek === '전체' || isUnassignedTimeFilter ? undefined : filters.dayOfWeek,
        startTime: filters.startTime === '전체' || isUnassignedTimeFilter ? undefined : filters.startTime,
        endTime: filters.endTime === '전체' || isUnassignedTimeFilter ? undefined : filters.endTime,
        unassignedTime: isUnassignedTimeFilter ? true : undefined
      }, page, pageSize);

      if (!isLatestRequest()) {
        return;
      }

      // 페이징 응답 처리
      debugLog('📥 API 응답 데이터:', response);

      if (response.content) {
        // 백엔드에서 페이징 응답이 온 경우
        debugLog(`✅ 페이징 응답: ${response.content.length}개 항목, 총 ${response.totalElements}개 중 ${response.number + 1}/${response.totalPages} 페이지`);
        const formattedCourses = response.content.map((subject, index) => formatCourse(subject, index));
        setCourses(append ? prev => [...prev, ...formattedCourses] : formattedCourses);
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
        setCurrentPage(response.number || 0);
      } else {
        // 기존 배열 응답 (백엔드 미수정 시 호환성)
        debugLog(`배열 응답: ${response.length}개 항목 (페이징 미적용)`);
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

      if (!import.meta.env.DEV) {
        if (!append) {
          setCourses([]);
          setTotalPages(0);
          setTotalElements(0);
          setCurrentPage(0);
          setCourseLoadError(true);
        }
        showToast('과목 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
        return;
      }

      debugLog('서버 연결 실패, 개발용 Mock 데이터 사용:', error.message);
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
      debugLog('🚫 loadUserData: user가 없어서 리턴');
      return;
    }

    debugLog('🔄 loadUserData 시작, user:', user.id);

    try {
      // 위시리스트 로드
      debugLog('📋 위시리스트 API 호출 중...');
      const wishlistData = await wishlistAPI.getByUser(user.id, CURRENT_SEMESTER);
      debugLog('✅ 위시리스트 데이터 받음:', wishlistData);

      const formattedWishlist = wishlistData.map((item) => {
        debugLog('위시리스트 아이템:', item);

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
      debugLog('📋 포맷된 위시리스트:', formattedWishlist);
      setWishlist(formattedWishlist);

      // 개인 시간표 로드
      const timetableData = await timetableAPI.getByUser(user.id, CURRENT_SEMESTER);
      const formattedTimetable = timetableData.map((item, index) =>
        formatCourse(item.subject, index)
      );
      setTimetable(formattedTimetable);
    } catch (error) {
      debugLog('사용자 데이터 로드 실패:', error.message);
      showToast('저장한 시간표를 불러오지 못했습니다.', 'error');
    }
  };

  // 검색 실행 함수
  const executeSearch = () => {
    if (searchTerm && searchTerm.trim()) trackEvent('SEARCH', searchTerm.trim());
    setCurrentPage(0); // 검색 시 첫 페이지로 리셋
    loadCourses(0);
    // 재검색/필터 변경(리스트 교체)마다 스크롤을 위로 리셋 — 무한스크롤로 내려간 위치와 어긋나지 않게.
    resultsListRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  const defaultFilters = { department: '전체', subjectType: '전체', grade: '전체', credits: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체', timeBlocks: {} };
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => (
    key === 'timeBlocks' ? Object.keys(value || {}).length > 0 : value !== '전체'
  )).length;
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

  const handleApplyMobileSearch = (term, field) => {
    setSearchTerm(term);
    setSearchField(field);
    if (term) trackEvent('SEARCH', term);
    setCurrentPage(0);
    loadCourses(0, false, { searchTerm: term, searchField: field });
    resultsListRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  // 필터 칩의 개별 해제(X). filters 변경은 자동 재검색 effect 가 처리한다.
  const handleClearFilterField = useCallback((key) => {
    setFilters(prev => {
      if (key === 'time') {
        return { ...prev, timeBlocks: {}, startTime: '전체', endTime: '전체' };
      }
      return { ...prev, [key]: '전체' };
    });
  }, []);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchField('subjectName');
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
    // executeSearch 는 렌더마다 새로 만들어지는 함수라 deps 에 넣으면 무한 재실행된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // searchTerm 제거, filters만 자동 검색

  useEffect(() => {
    // 무한 스크롤 append(currentPage 증가) 시엔 펼친 과목이 닫히지 않도록 filters/searchTerm 변경 때만 리셋.
    setExpandedCourseId(null);
  }, [filters, searchTerm]);

  // 페이징이 적용되었으므로 클라이언트 필터링 제거 (서버에서 처리)
  const filteredCourses = courses;

  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

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
      // 빠르게 스크롤해도 콘텐츠 끝(빈 영역)을 넘겨보기 전에 미리 다음 페이지를 당겨온다.
    }, { rootMargin: '600px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // loadCourses 는 렌더마다 새로 만들어지는 함수라 deps 에 넣으면 옵저버가 계속 재생성된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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





  // React.memo 된 CourseRow 에 참조가 변하지 않는 핸들러를 넘기기 위한 우회.
  // 원본 핸들러는 여러 state 를 클로저로 캡처해 매 렌더 새로 만들어지므로,
  // 최신 구현은 ref 로 갱신하고 겉 함수만 useCallback 으로 고정한다.
  const addToTimetableImplRef = useRef(null);
  const addToWishlistImplRef = useRef(null);
  const stableAddToTimetable = useCallback((course) => addToTimetableImplRef.current?.(course), []);
  const stableAddToWishlist = useCallback((course) => addToWishlistImplRef.current?.(course), []);
  const handleToggleExpandedRow = useCallback((courseId) => {
    setExpandedCourseId(prev => (prev === courseId ? null : courseId));
  }, []);

  const handleAddToTimetable = async (courseToAdd) => {
    trackEvent('TIMETABLE_ADD', courseToAdd?.name);
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // 따닥(더블 클릭) 방지: 0.5초 이내 동일 과목 요청 무시
    const now = Date.now();
    const lastClick = lastClickRefs.current[courseToAdd.id] || 0;
    if (now - lastClick < 500) {
      debugLog(`[Throttle] 중복 시간표 추가 요청 방지: ${courseToAdd.name}`);
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
    scrollMobileTimetableToCourse(courseToAdd.name);
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
    trackEvent('WISHLIST_ADD', courseToAdd?.name);
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // 따닥(더블 클릭) 방지: 0.5초 이내 동일 과목 요청 무시
    const now = Date.now();
    const lastClick = lastClickRefs.current[courseToAdd.id] || 0;
    if (now - lastClick < 500) {
      debugLog(`[Throttle] 중복 위시리스트 요청 방지: ${courseToAdd.name}`);
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

  // 매 렌더마다 최신 구현으로 갱신한다(이벤트는 커밋 이후에 발생하므로 안전).
  addToTimetableImplRef.current = handleAddToTimetable;
  addToWishlistImplRef.current = handleAddToWishlist;

  const handleRemoveFromWishlist = async (courseId) => {
    // 낙관적 제거: 먼저 화면에서 지우고 서버 실패 시 되돌린다.
    const previousWishlist = wishlist;
    setWishlist(prev => prev.filter(course => course.id !== courseId));
    showToast('위시리스트에서 제거했어요!');
    try {
      await wishlistAPI.remove(user.id, courseId);
    } catch (error) {
      setWishlist(previousWishlist);
      showToast(`제거에 실패해 되돌렸어요: ${error.message}`, 'warning');
    }
  };

  const handleToggleRequired = async (courseId, currentIsRequired) => {
    // 낙관적 토글: 먼저 반영하고 서버 실패 시 되돌린다.
    const previousWishlist = wishlist;
    setWishlist(prev => prev.map(course =>
      course.id === courseId
        ? { ...course, isRequired: !currentIsRequired }
        : course
    ));
    const courseName = wishlist.find(c => c.id === courseId)?.name || '선택한 과목';
    showToast(`'${courseName}' 과목을 ${!currentIsRequired ? '필수' : '선택'} 과목으로 변경했어요!`);
    try {
      await wishlistAPI.updateRequired({
        userId: user.id,
        subjectId: courseId,
        isRequired: !currentIsRequired
      });
    } catch (error) {
      setWishlist(previousWishlist);
      showToast(`변경에 실패해 되돌렸어요: ${error.message}`, 'warning');
    }
  };

  const handleRunGenerator = async () => {
    trackEvent('COMBINATION_GENERATE');
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

      setIsGenerating(false);
      setCombinationResults(response);
      setShowCombinationResults(true);
      showToast(`${response.totalCount}개의 시간표 조합을 찾았습니다!`);
    } catch (error) {
      setIsGenerating(false);
      if (!import.meta.env.DEV) {
        showToast(error.message || '시간표 조합을 만들지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
        return;
      }

      debugLog('시간표 조합 생성 실패, 개발용 Mock 데이터 사용:', error.message);

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

      setIsGenerating(false);
      setCombinationResults(mockCombinationResults);
      setShowCombinationResults(true);
      showToast(`${mockCombinationResults.totalCount}개의 시간표 조합을 찾았습니다! (Mock 데이터)`);
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
      debugLog('🔄 조합 선택:', selectedCombination);

      // 기존 시간표 클리어(서로 독립인 삭제라 병렬로 처리해 모바일 회선에서 대기를 줄인다)
      await Promise.all(timetable.map(course => timetableAPI.remove(user.id, course.id)));

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
        debugLog('📝 포맷팅 중인 과목:', subject);
        const formatted = formatCourse(subject, index);
        debugLog('✅ 포맷된 결과:', formatted);
        return formatted;
      });

      debugLog('Selected timetable combination:', formattedCombination);
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
      debugLog('✅ 시간표 제거 성공:', courseToRemove.name);

      // 서버에서 최신 시간표 데이터를 다시 불러와서 동기화
      setTimeout(async () => {
        try {
          const timetableData = await timetableAPI.getByUser(user.id, CURRENT_SEMESTER);
          const formattedTimetable = timetableData.map((item, index) =>
            formatCourse(item.subject, index)
          );
          setTimetable(formattedTimetable);
          debugLog('🔄 시간표 동기화 완료');
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
      debugLog('✅ 시간표 전체 삭제 성공');

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
    trackEvent('COURSE_DETAIL_VIEW', course?.name);
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

    // 낙관적 추가: 먼저 담고 서버 실패 시 되돌린다.
    const previousWishlist = wishlist;
    setWishlist(prev => [...prev, { ...course, ...getCourseTypeColorScheme(course.type), isRequired: false }]);
    showToast(`'${course.name}' 과목을 위시리스트에 담았어요!`);
    try {
      await wishlistAPI.add({
        userId: user.id,
        subjectId: course.id,
        semester: CURRENT_SEMESTER,
        priority: 3,
        isRequired: false
      });
    } catch (error) {
      setWishlist(previousWishlist);
      showToast(`위시리스트 추가에 실패해 되돌렸어요: ${error.message}`, 'error');
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

  const isAdminSubjectsPage = window.location.pathname === '/admin/subjects';

  const hasResultPagination = totalPages > 1;
  const canGoToPreviousPage = hasResultPagination && currentPage > 0 && !isLoading;
  const canGoToNextPage = hasResultPagination && currentPage < totalPages - 1 && !isLoading;
  const hasBlockingOverlay = showWishlistModal || showDeveloperNotes || showAccountModal || showFilters || mobileFilterField !== null || showSearchSheet
    || showAuthModal || showCombinationResults || showCourseDetailModal || showTimetableListModal;
  // App 레벨 오버레이의 body 스크롤 락을 한 곳에서 전역 카운터로 관리한다.
  // (내부 state 로 열리는 시트 3곳은 각자 useBodyScrollLock 을 호출한다.)
  // 훅이므로 아래의 조기 return 들보다 반드시 먼저 호출한다(Rules of Hooks).
  useBodyScrollLock(hasBlockingOverlay && !isAdminSubjectsPage && currentView === 'timetable');

  if (isAdminSubjectsPage) {
    // 프로덕션에서는 기존 보안 결정(ee05703)대로 404 위장 화면을 유지한다.
    if (!import.meta.env.DEV || !AdminSubjectManager) {
      return <HiddenPage />;
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <Toast {...toast} onDismiss={() => setToast(prev => ({ ...prev, show: false }))} />
        <div className="max-w-7xl mx-auto px-3 py-4 md:px-8 md:py-10">
          <header className="mb-4 md:mb-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-4xl font-bold tracking-tight text-slate-900">과목 관리</h1>
                <p className="mt-1 text-sm md:text-base text-slate-500">관리자 전용 과목 데이터 관리 페이지입니다(개발 모드에서만 열립니다).</p>
              </div>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                과목 검색으로 돌아가기
              </a>
            </div>
          </header>
          <React.Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">관리 도구를 불러오는 중...</p>}>
            <AdminSubjectManager showToast={showToast} />
          </React.Suspense>
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
  const userDisplayName = user?.nickname || user?.username || '사용자';

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast {...toast} onDismiss={() => setToast(prev => ({ ...prev, show: false }))} />
      <LoadingOverlay isGenerating={isGenerating} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showToast={showToast}
        onRegisterSuccess={() => setTutorialRunId(run => run + 1)}
      />
      <NewUserTutorial runId={tutorialRunId} onPrepare={prepareTutorialTargets} onFinish={closeNewUserTutorial} />
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
      <MobileSearchSheet
        isOpen={showSearchSheet}
        onClose={() => setShowSearchSheet(false)}
        initialTerm={searchTerm}
        initialField={searchField}
        onApply={handleApplyMobileSearch}
      />
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
        className={`${showMobileSearch ? 'hidden md:block' : ''} sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] md:px-8 md:[padding-left:max(2rem,env(safe-area-inset-left))] md:[padding-right:max(2rem,env(safe-area-inset-right))]">
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
                <button onClick={() => setShowAccountModal(true)} className="btn-ghost h-10 px-3 text-[13px] fine:h-8 md:px-2.5">
                  <UserCircle size={14} /> 계정
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="btn-primary h-10 px-3 text-[13px] fine:h-8">
                <LogIn size={14} /> 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        aria-hidden={hasBlockingOverlay}
        inert={hasBlockingOverlay ? '' : undefined}
        className="mx-auto max-w-7xl px-4 py-4 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] md:px-8 md:py-6 md:[padding-left:max(2rem,env(safe-area-inset-left))] md:[padding-right:max(2rem,env(safe-area-inset-right))]"
      >
        <>
        <section aria-label="모바일 시간표" className={`sticky ${showMobileSearch ? 'top-0' : 'top-14'} z-20 -mx-4 mb-3 bg-slate-50 px-4 pt-2 pb-1 md:hidden`}>
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
                className="inline-flex h-10 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                className="inline-flex h-10 items-center gap-1 rounded-full bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                <Star size={13} /> 조합
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobileSearch(value => {
                    const next = !value;
                    if (!next) {
                      // 긴 결과 리스트에서 깊이 스크롤한 채 닫으면 문서가 짧아져도
                      // iOS Safari 가 스크롤 오프셋을 유지해 빈 공간에 갇힌다 → 상단으로 리셋.
                      window.scrollTo({ top: 0 });
                    }
                    return next;
                  });
                }}
                aria-label={showMobileSearch ? '과목 검색 닫기' : '과목 검색 열기'}
                aria-expanded={showMobileSearch}
                className={`inline-flex h-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  showMobileSearch ? 'w-10' : 'gap-1 px-3 text-xs font-semibold'
                }`}
              >
                {showMobileSearch ? <X size={16} /> : <><Search size={14} /> 과목 찾기</>}
              </button>
            </div>
          </div>
          {/* overflow 를 hidden↔auto 로 동적 전환하면 iOS Safari 가 첫 터치 전까지
              스크롤 대상으로 인식하지 못하므로, 항상 auto 로 두고 높이만 토글한다. */}
          <div ref={mobileTimetableViewportRef} className={`rounded-2xl overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] ${showMobileSearch ? 'max-h-[34svh]' : ''}`}>
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
          {showMobileSearch && (
            <div data-tour="course-search">
              <MobileFilterScroller
                filters={filters}
                searchTerm={searchTerm}
                searchField={searchField}
                activeFilterCount={activeFilterCount}
                onOpenFilters={() => setShowFilters(true)}
                onReset={handleResetFilters}
                onOpenSearch={() => setShowSearchSheet(true)}
                onSelectField={setMobileFilterField}
                onClearField={handleClearFilterField}
                onClearSearch={() => handleApplyMobileSearch('', searchField)}
              />
            </div>
          )}
        </section>

        {/* 검색 바 */}
        <section
          data-tour="course-search"
          aria-label="과목 검색"
          className="card hidden p-3 md:block md:p-4"
        >
          <div className="hidden gap-2 md:flex">
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
              aria-label="검색"
              className="btn-primary h-10 px-4 md:h-11 md:px-5"
            >
              <Search size={15} className="sm:hidden" />
              <span className="hidden sm:inline">검색</span>
            </button>
          </div>

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
              ) : courseLoadError ? (
                <ErrorResults onRetry={() => loadCourses(0)} />
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
                      onAddToTimetable={stableAddToTimetable}
                      onAddToWishlist={stableAddToWishlist}
                      actionsDisabled={showWishlistModal}
                      showWishlistCountPreview={showWishlistCountPreview}
                      isExpanded={expandedCourseId === course.id}
                      onToggleExpanded={handleToggleExpandedRow}
                    />
                  ))}
                </ul>
              )}

              {/* 모바일 무한 스크롤 sentinel (데스크톱은 md:hidden 이라 페이지네이션 사용) */}
              {currentPage + 1 < totalPages && (
                <div ref={loadMoreRef} className="md:hidden">
                  {isLoadingMore ? (
                    // 로딩 중엔 빈 공간 대신 스켈레톤을 보여 빠르게 스크롤해도 흰 화면이 보이지 않게 한다.
                    <ul className="course-list" aria-label="과목 더 불러오는 중">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <CourseRowSkeleton key={i} />
                      ))}
                    </ul>
                  ) : (
                    // 관찰용 sentinel 영역(다음 페이지 트리거). 실제 로딩 표시는 위 스켈레톤이 담당.
                    <div className="py-6" aria-hidden="true" />
                  )}
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
              onClick={() => setTutorialRunId(run => run + 1)}
              className="btn-ghost h-10 px-3 text-xs text-slate-500"
            >
              <Info size={13} /> 사용법
            </button>
            <button
              type="button"
              onClick={() => setShowDeveloperNotes(true)}
              className="btn-ghost h-10 px-3 text-xs text-slate-500"
            >
              <Info size={13} /> 개발 노트
            </button>
            <a
              href="https://www.instagram.com/jjh020426?igsh=eGcxOXllcm16Yzk2&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost h-10 px-3 text-xs text-slate-500"
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
