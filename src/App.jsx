import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, Info, ChevronDown, MapPin, Clock, Star, X, ShoppingCart, CalendarDays, AlertTriangle, LogIn, LogOut, Download, Maximize } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import Pagination from './components/Pagination';
import TimetableCombinationResults from './components/TimetableCombinationResults';
import WishlistModal from './components/WishlistModal';
import CourseDetailModal from './components/CourseDetailModal';
import TimetableCourseMenu from './components/TimetableCourseMenu';
import TimetableListModal from './components/TimetableListModal';
import { subjectAPI, wishlistAPI, timetableAPI, combinationAPI } from './services/api';


// --- Helper Functions & Constants ---

const CURRENT_SEMESTER = '2024-2';



// API 응답 시간 데이터를 파싱하여 객체 배열로 변환
const parseTime = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) return [];
  
  const dayMapping = {
    'MONDAY': '월',
    'TUESDAY': '화', 
    'WEDNESDAY': '수',
    'THURSDAY': '목',
    'FRIDAY': '금',
    'SATURDAY': '토',
    'SUNDAY': '일'
  };
  
  return schedules.map(schedule => {
    let startPeriod = parseFloat(schedule.startTime); // Ensure it's a number
    let endPeriod = parseFloat(schedule.endTime);   // Ensure it's a number

    // Handle cases where parsing results in NaN
    if (isNaN(startPeriod)) startPeriod = 0; 
    if (isNaN(endPeriod)) endPeriod = 0;     

    // 요일 변환 - 영어를 한국어로 변환 또는 원본 유지
    const day = dayMapping[schedule.dayOfWeek] || schedule.dayOfWeek;
    
    return {
      day: day,
      start: startPeriod,
      end: endPeriod,
    };
  });
};

// 레거시 시간 문자열 파싱 (기존 코드 호환성을 위해 유지)
const parseTimeString = (timeString) => {
  if (!timeString) return [];
  return timeString.split(',').map(part => {
    const trimmed = part.trim();
    const day = trimmed[0];
    const hours = trimmed.substring(2).split('-').map(Number);
    return { day, start: hours[0], end: hours[hours.length - 1] };
  });
};



// 두 과목 간 시간 충돌을 확인하는 함수
const checkConflict = (courseA, courseB) => {
  const timesA = courseA.schedules ? parseTime(courseA.schedules) : parseTimeString(courseA.time);
  const timesB = courseB.schedules ? parseTime(courseB.schedules) : parseTimeString(courseB.time);

  for (const timeA of timesA) {
    for (const timeB of timesB) {
      if (timeA.day === timeB.day && timeA.start < timeB.end && timeA.end > timeB.start) {
        return true; // 충돌 발생
      }
    }
  }
  return false; // 충돌 없음
};

// API 과목 데이터를 UI 표시용 형태로 변환
const formatCourse = (subject, index = 0) => {
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
  
  const colorScheme = colors[index % colors.length];
  const timeString = subject.schedules && Array.isArray(subject.schedules) ? 
    subject.schedules.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(', ') :
    subject.time || '';
  
  return {
    id: subject.id,
    name: subject.subjectName || subject.name,
    credits: subject.credits,
    professor: subject.professor,
    department: subject.department,
    type: subject.subjectType || subject.type,
    time: timeString,
    schedules: subject.schedules,
    rating: subject.rating || 4.0,
    reviews: subject.reviews || 0,
    ...colorScheme
  };
};

const departments = [
  '전체',
  '(핵심)사회',
  '(핵심)외국어',
  '(핵심)인문',
  'IBE전공',
  '건설환경공학전공',
  '건축공학전공',
  '경영학부',
  '경제학과',
  '공연예술학과',
  '광전자공학전공(연계)',
  '과학기술',
  '교직',
  '국어교육과',
  '국어국문학과',
  '군사학',
  '기계공학과',
  '기초과학ㆍ공학',
  '나노바이오공학전공',
  '데이터과학과',
  '도시건축학부',
  '도시건축학전공',
  '도시공학과',
  '도시행정학과',
  '도시환경공학부',
  '독어독문학과',
  '동북아국제통상전공',
  '디자인학부',
  '무역학부',
  '문헌정보학과',
  '물리학과',
  '미디어커뮤니케이션학과',
  '물류학전공(연계)',
  '바이오-로봇시스템공학과',
  '반도체융합전공',
  '법학부',
  '분자의생명전공',
  '불어불문학과',
  '사회',
  '사회복지학과',
  '산업경영공학과',
  '생명공학부',
  '생명공학전공',
  '생명과학부',
  '생명과학전공',
  '서양화전공',
  '세무회계학과',
  '소비자학과',
  '수학과',
  '수학교육과',
  '스마트물류공학전공',
  '스포츠과학부',
  '신소재공학과',
  '안전공학과',
  '에너지화학공학과',
  '역사교육과',
  '영어교육과',
  '영어영문학과',
  '예술체육',
  '외국어',
  '운동건강학부',
  '유아교육과',
  '윤리교육과',
  '인문',
  '일본지역문화학과',
  '일선',
  '일어교육과',
  '임베디드시스템공학과',
  '자유전공학부',
  '전기공학과',
  '전자공학과',
  '전자공학부',
  '전자공학전공',
  '정보통신공학과',
  '정치외교학과',
  '조형예술학부',
  '중어중국학과',
  '창의인재개발학과',
  '체육교육과',
  '컴퓨터공학부',
  '패션산업학과',
  '한국화전공',
  '해양학과',
  '핵심과학기술',
  '핵심교양',
  '행정학과',
  '화학과',
  '환경공학전공'
];
const courseTypes = ['전체', '전핵', '전심', '전기', '심교', '핵교', '기교', '일선'];
const grades = ['전체', '1학년', '2학년', '3학년', '4학년'];

// 요일 및 시간대 필터링을 위한 상수
const filterDaysOfWeek = ['전체', '월', '화', '수', '목', '금', '토'];
const timeOptions = ['전체', 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12];
const daysOfWeek = ['월', '화', '수', '목', '금'];
// 정수 교시 + 야간 교시
// 그리드를 2배로 만들기 (30분 단위)
const timeSlots = [
  // 주간 교시: 각 교시마다 2개 슬롯 (상반부, 하반부)
  '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '5-1', '5-2',
  '6-1', '6-2', '7-1', '7-2', '8-1', '8-2', '9-1', '9-2',
  // 야간 교시: 각 교시마다 2개 슬롯
  '야1-1', '야1-2', '야2-1', '야2-2', '야3-1', '야3-2', '야4-1', '야4-2'
];

// 사용자에게 보여줄 교시 (2개씩 묶어서 하나로)
const displayTimeSlots = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, '야1', '야2', '야3', '야4'
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-50">
            <div className="text-white text-2xl font-bold mb-4">🔮 마법을 부리는 중...</div>
            <div className="w-64 bg-gray-600 rounded-full h-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="text-white mt-2">{Math.round(progress)}%</div>
            <div className="text-gray-300 mt-1">최적의 시간표 조합을 찾고 있어요!</div>
        </div>
    );
};

const MiniTimetable = ({ courses, onExportPDF, onRemoveCourse, onAddToWishlist, onViewCourseDetails, onClearAll, onShowTimetableList }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  const handleCourseClick = (event, course) => {
    event.preventDefault();
    event.stopPropagation();
    
    setSelectedCourse(course);
    setMenuPosition({
      x: event.clientX,
      y: event.clientY
    });
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    setSelectedCourse(null);
  };
  const grid = useMemo(() => {
    const newGrid = {};
    daysOfWeek.forEach(day => {
      newGrid[day] = {};
      timeSlots.forEach(slot => {
        newGrid[day][slot] = null;
      });
    });

    const getSlotIndex = (period) => {
      // period는 1.0, 1.5, 2.0, ..., 9.0, 10.0(야1), 10.5(야1.5) 등
      if (isNaN(period) || period < 1) return -1; // 유효하지 않은 교시
      
      // 1교시 = 인덱스 0, 1.5교시 = 인덱스 1, ..., 9교시 = 인덱스 16, 9.5교시 = 인덱스 17
      // 야1교시 = 인덱스 18, 야1.5교시 = 인덱스 19
      return Math.round((period - 1) * 2); 
    };

    courses.forEach(course => {
      const times = course.schedules ? parseTime(course.schedules) : parseTimeString(course.time);
      times.forEach(({ day, start, end }) => {
        if (newGrid[day]) {
          const startIndex = getSlotIndex(start);
          const endIndex = getSlotIndex(end);
          const totalSlots = endIndex - startIndex;

          if (totalSlots <= 0) return; // 유효하지 않은 시간 범위

          let isFirstSlot = true;

          for (let i = startIndex; i < endIndex; i++) {
            const slotKey = timeSlots[i];
            if (slotKey && newGrid[day][slotKey] === null) {
              newGrid[day][slotKey] = {
                ...course,
                isStart: isFirstSlot,
                span: totalSlots,
              };
              isFirstSlot = false;
            }
          }
        }
      });
    });
    return newGrid;
  }, [courses]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mini-timetable">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-gray-800">📅 내 시간표</h3>
            {courses.length > 0 && (
              <p className="text-sm text-gray-600">
                총 {courses.reduce((total, course) => total + (course.credits || 0), 0)}학점
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* 리스트 보기 버튼 */}
            {courses.length > 0 && onShowTimetableList && (
              <button
                onClick={onShowTimetableList}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="시간표 리스트 보기"
              >
                <CalendarDays size={18} className="text-gray-600" />
              </button>
            )}
            
            {/* 전체 삭제 버튼 */}
            {courses.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                className="p-2 hover:bg-red-100 rounded-full transition-colors"
                title="시간표 전체 삭제"
              >
                <X size={18} className="text-red-500" />
              </button>
            )}
          </div>
        </div>
        <div className="w-full overflow-hidden">
          <table className="w-full border-collapse border border-gray-200 table-fixed">
            <colgroup>
              <col className="w-12" />
              {daysOfWeek.map(day => (
                <col key={day} className="w-16" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="bg-gray-50 p-1 text-center font-bold text-xs text-gray-700 border border-gray-200"></th>
                {daysOfWeek.map(day => (
                  <th key={day} className="bg-gray-50 p-1 text-center font-bold text-xs text-gray-700 border border-gray-200">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, index) => {
                const isTopBorder = index > 0 && slot.endsWith('-1') && !slot.startsWith('야1');
                const isNightTopBorder = slot === '야1-1';
                return (
                  <tr key={slot} style={{height: '24px'}} className={`${isTopBorder ? 'border-t-2 border-gray-300' : ''} ${isNightTopBorder ? 'border-t-2 border-blue-300' : ''}`}>
                    {slot.endsWith('-1') && (
                      <td rowSpan={2} className={`text-gray-700 text-center p-1 font-medium text-xs border border-gray-200 ${slot.startsWith('야') ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'}`}>
                        {displayTimeSlots[Math.floor(index / 2)]}{slot.startsWith('야') ? '' : '교시'}
                      </td>
                    )}
                    {daysOfWeek.map(day => {
                      const course = grid[day]?.[slot];
                      // 상반부(-1) slot에는 과목이 없으면 무조건 빈 td 추가
                      if (slot.endsWith('-1') && (!course || !course.span)) {
                        return <td key={`${day}-${slot}-empty`} className="empty-half"></td>;
                      }
                      if (course && course.isStart) {
                        const backgroundColor = course.color || 'bg-blue-500';
                        const borderColor = course.borderColor || 'border-blue-400';
                        return (
                          <td 
                            key={`${day}-${slot}`}
                            rowSpan={course.span || 1}
                            className={`p-0.5 text-white text-[10px] leading-tight ${backgroundColor} ${borderColor} border-l-2 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity align-top`}
                            onClick={(e) => handleCourseClick(e, course)}
                          >
                            <div className="text-center">
                              <div className="font-semibold text-[10px] leading-tight">{course.name}</div>
                            </div>
                          </td>
                        );
                      } else if (course && !course.isStart) {
                        return null; // span으로 처리되므로 렌더링하지 않음
                      } else {
                        // 빈 셀
                        return (
                          <td key={`${day}-${slot}`} className={`min-h-[14px] border-r border-gray-200 ${slot.endsWith('-2') ? 'border-b' : ''} ${slot.startsWith('야') ? 'bg-blue-50' : 'bg-gray-100'}`}></td>
                        );
                      }
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* 범례 */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-100 rounded border"></div>
              <span>주간</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-50 rounded border-blue-200"></div>
              <span>야간</span>
            </div>
          </div>
        </div>

        {/* 시간표 과목 메뉴 */}
        <TimetableCourseMenu
          isOpen={showMenu}
          onClose={handleCloseMenu}
          course={selectedCourse}
          position={menuPosition}
          onRemove={onRemoveCourse}
          onViewDetails={() => onViewCourseDetails(selectedCourse)}
          onAddToWishlist={onAddToWishlist}
        />
    </div>
  );
};

const CourseCard = ({ course, onAddToTimetable, onAddToWishlist }) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <p className="text-lg font-bold text-gray-800">{course.name} ({course.credits}학점)</p>
        <div className={`inline-block px-2 py-0.5 text-xs font-semibold ${course.color} ${course.textColor} rounded-full`}>
            {course.type}
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center"><MapPin size={14} className="mr-1.5 text-gray-400" />{course.department} | {course.professor}</div>
        <div className="flex items-center"><Clock size={14} className="mr-1.5 text-gray-400" />{course.time}</div>
      </div>
      <div className="mt-3 pt-3 border-t flex justify-end gap-2">
        <button onClick={() => onAddToWishlist(course)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <ShoppingCart size={14} /> 담기
        </button>
        <button onClick={() => onAddToTimetable(course)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition shadow">
          <Plus size={14} /> 바로 추가
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
  const [filters, setFilters] = useState({ department: '전체', subjectType: '전체', grade: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' });
  
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
  
  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(20); // 페이지당 20개 항목
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // 시간표 조합 결과
  const [combinationResults, setCombinationResults] = useState(null);
  const [showCombinationResults, setShowCombinationResults] = useState(false);
  
  // 목표 학점 설정
  const [targetCredits, setTargetCredits] = useState(18);

  // 과목 검색 및 로드
  useEffect(() => {
    loadCourses();
  }, []);

  // 사용자 데이터 로드 - 인증 로딩 완료 후 실행
  useEffect(() => {
    console.log('🔍 useEffect 실행 - authLoading:', authLoading, 'user:', user);
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
        console.log(`⚠️ 배열 응답: ${response.length}개 항목 (페이징 미적용)`);
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
        console.log('🔍 위시리스트 아이템:', item);
        
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

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleAddToTimetable = async (courseToAdd) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

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
      setWishlist([...wishlist, { ...courseToAdd, isRequired }]);
      showToast(`'${courseToAdd.name}' 과목을 위시리스트에 담았어요!`);
    } catch (error) {
      showToast(error.message, 'warning');
    }
  };

  const handleRemoveFromWishlist = async (courseId) => {
    try {
      await wishlistAPI.remove(user.id, courseId);
      setWishlist(wishlist.filter(c => c.id !== courseId));
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
      
      setWishlist(wishlist.map(course => 
        course.id === courseId 
          ? { ...course, isRequired: !currentIsRequired }
          : course
      ));
      
      const course = wishlist.find(c => c.id === courseId);
      showToast(`'${course.name}' 과목을 ${!currentIsRequired ? '필수' : '선택'} 과목으로 변경했어요!`);
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
        maxCombinations: 20
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
        ...mockOptionalCourses.slice(0, Math.max(1, targetCredits/3 - requiredCoursesInMock.length))
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
      
      console.log('🎯 최종 시간표:', formattedCombination);
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
    setFilters({ department: '전체', subjectType: '전체', grade: '전체', dayOfWeek: '전체', startTime: '전체', endTime: '전체' });
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
          console.warn('⚠️ 시간표 동기화 실패:', syncError.message);
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

  
  
  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <Toast {...toast} onDismiss={() => setToast(prev => ({ ...prev, show: false }))} />
      <LoadingOverlay isGenerating={isGenerating} />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        showToast={showToast}
      />
      <WishlistModal
        isOpen={showWishlistModal}
        onClose={() => setShowWishlistModal(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onToggleRequired={handleToggleRequired}
        onAddToTimetable={handleAddToTimetable}
        targetCredits={targetCredits}
        setTargetCredits={setTargetCredits}
      />
      <CourseDetailModal
        isOpen={showCourseDetailModal}
        onClose={() => {
          setShowCourseDetailModal(false);
          setSelectedCourseForDetail(null);
        }}
        course={selectedCourseForDetail}
      />
      <TimetableListModal
        isOpen={showTimetableListModal}
        onClose={() => setShowTimetableListModal(false)}
        courses={timetable}
        onRemoveCourse={handleRemoveFromTimetable}
        onAddToWishlist={handleMoveToWishlistFromTimetable}
        onViewCourseDetails={handleViewCourseDetails}
      />
      {showCombinationResults && combinationResults && (
        <TimetableCombinationResults
          results={combinationResults}
          onClose={() => setShowCombinationResults(false)}
          onSelectCombination={handleSelectCombination}
        />
      )}

      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800">📚 과목 검색</h1>
              <p className="text-gray-500 mt-2">과목을 바로 시간표에 추가하거나, 위시리스트에 담아 조합을 찾아보세요.</p>
            </div>
            <div className="flex-shrink-0">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{user.nickname}님</p>
                    <p className="text-sm text-gray-500">{user.major} {user.grade}학년</p>
                  </div>
                  <button onClick={handleLogout} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center gap-2">
                    <LogOut size={16} /> 로그아웃
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2">
                  <LogIn size={16} /> 로그인 하기
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 검색 바 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="과목명 또는 교수명 입력 후 엔터키 또는 검색 버튼 클릭..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={executeSearch}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <Search size={20} />
                검색
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] text-sm"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={filters.subjectType}
                onChange={(e) => setFilters(prev => ({ ...prev, subjectType: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] text-sm"
              >
                {courseTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[90px] text-sm"
              >
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              <select
                value={filters.dayOfWeek}
                onChange={(e) => setFilters(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[80px] text-sm"
              >
                {filterDaysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <select
                value={filters.startTime}
                onChange={(e) => setFilters(prev => ({ ...prev, startTime: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] text-sm"
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>
                    {time === '전체' ? '시작시간' : `${time}교시`}
                  </option>
                ))}
              </select>
              <select
                value={filters.endTime}
                onChange={(e) => setFilters(prev => ({ ...prev, endTime: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] text-sm"
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>
                    {time === '전체' ? '종료시간' : `${time}교시`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Course List */}
          <main className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-700">
                검색 결과 
                {totalElements > 0 && (
                  <span className="text-gray-500">
                    (총 {totalElements.toLocaleString()}개 중 {filteredCourses.length}개 표시)
                  </span>
                )}
                {isLoading && <span className="text-sm text-blue-500 ml-2">로딩 중...</span>}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  onAddToTimetable={handleAddToTimetable}
                  onAddToWishlist={handleAddToWishlist}
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
                <MiniTimetable 
                  courses={timetable} 
                  onRemoveCourse={handleRemoveFromTimetable}
                  onAddToWishlist={handleMoveToWishlistFromTimetable}
                  onViewCourseDetails={handleViewCourseDetails}
                  onClearAll={handleClearAllTimetable}
                  onShowTimetableList={handleShowTimetableList}
                />
              </div>

              {/* Wishlist */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-5 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-800">🛒 위시리스트</h3>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-500">
                        총 {wishlist.reduce((acc, c) => acc + c.credits, 0)}학점
                      </div>
                      <button
                        onClick={() => setShowWishlistModal(true)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="위시리스트 확장 보기"
                      >
                        <Maximize size={18} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 목표 학점 선택 */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">🎯 목표 학점:</span>
                    <select
                      value={targetCredits}
                      onChange={(e) => setTargetCredits(parseInt(e.target.value))}
                      className="px-3 py-1 text-sm border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                <div className="p-3 max-h-60 overflow-y-auto">
                    {wishlist.length > 0 ? (
                        <ul className="space-y-3">
                        {wishlist.map(course => (
                            <li key={course.id} className={`p-3 rounded-lg border-2 ${course.isRequired ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-gray-800">{course.name}</p>
                                    {course.isRequired && (
                                      <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                        필수
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">{course.credits}학점 | {course.professor}</p>
                                  
                                  
                                  {/* 필수 과목 체크박스 */}
                                  <div className="mt-2 flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`required-${course.id}`}
                                      checked={course.isRequired || false}
                                      onChange={() => handleToggleRequired(course.id, course.isRequired)}
                                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                                    />
                                    <label 
                                      htmlFor={`required-${course.id}`}
                                      className="text-sm text-gray-600 cursor-pointer"
                                    >
                                      필수 포함 과목
                                    </label>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemoveFromWishlist(course.id)} 
                                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 ml-2"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </li>
                        ))}
                        </ul>
                    ) : <div className="text-center py-8 text-gray-500">담은 과목이 없어요.</div>}
                </div>
                {wishlist.length > 0 && (
                  <div className="p-5 border-t border-gray-200">
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 text-center">
                        {wishlist.length}개 과목으로 {targetCredits}학점 맞춤 조합 생성
                      </div>
                      <button 
                        onClick={handleRunGenerator} 
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isGenerating ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            생성 중...
                          </span>
                        ) : (
                          `🚀 RUN! ${targetCredits}학점 시간표 생성`
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
      <div className="lg:hidden fixed bottom-6 right-6">
          <button className="bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2">
              <CalendarDays size={20} />
              <span>내 시간표 보기 ({timetable.length})</span>
          </button>
      </div>
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