import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';


// --- Helper Functions & Constants ---

const CURRENT_SEMESTER = '2024-2';



// API 응답 시간 데이터를 파싱하여 객체 배열로 변환
const parseTime = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) return [];

  const dayMapping = {
    'MONDAY': '월', 'Monday': '월',
    'TUESDAY': '화', 'Tuesday': '화',
    'WEDNESDAY': '수', 'Wednesday': '수',
    'THURSDAY': '목', 'Thursday': '목',
    'FRIDAY': '금', 'Friday': '금',
    'SATURDAY': '토', 'Saturday': '토',
    'SUNDAY': '일', 'Sunday': '일'
  };

  return schedules.map(schedule => {
    let startPeriod = parseFloat(schedule.startTime);
    let endPeriod = parseFloat(schedule.endTime);

    // [Bugfix] 24시간제 시간(예: 15:00, 09:30) 처리
    // 문자열에 ':'가 포함된 경우 (예: "09:30", "15:00")
    if (typeof schedule.startTime === 'string' && schedule.startTime.includes(':')) {
      const parts = schedule.startTime.split(':');
      // 시간 + 분(0.5단위 근사치) - 8
      // 예: 09:30 -> 9.5 - 8 = 1.5교시
      startPeriod = parseFloat(parts[0]) + (parseFloat(parts[1]) / 60) - 8;
    }
    if (typeof schedule.endTime === 'string' && schedule.endTime.includes(':')) {
      const parts = schedule.endTime.split(':');
      endPeriod = parseFloat(parts[0]) + (parseFloat(parts[1]) / 60) - 8;
    }

    // [Safety] 숫자로만 들어왔는데 13 이상이면 24시간제(Real Time)로 간주하고 변환
    // 예: startTime: 15 -> 15 - 8 = 7교시
    // 단, 1~12 사이는 교시로 간주 (기존 데이터 호환)
    if (startPeriod >= 13) startPeriod -= 8;
    if (endPeriod >= 13) endPeriod -= 8;

    // Handle cases where parsing results in NaN
    if (isNaN(startPeriod)) startPeriod = 0;
    if (isNaN(endPeriod)) endPeriod = 0;

    // 교시는 0.5 단위로 반올림 (Grid 매핑을 위해)
    // 예: 1.45 -> 1.5, 1.1 -> 1.0
    startPeriod = Math.round(startPeriod * 2) / 2;
    endPeriod = Math.round(endPeriod * 2) / 2;

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
    const timePart = trimmed.substring(2);

    let start, end;

    // [Bugfix] 15:00-18:00 같은 시간 형식 처리
    if (timePart.includes(':')) {
      const times = timePart.split('-').map(t => {
        const hour = parseFloat(t.split(':')[0]);
        return hour - 8;
      });
      start = times[0];
      end = times[times.length - 1];
    } else {
      // 기존 1-2, 3-4 형식
      const hours = timePart.split('-').map(Number);
      start = hours[0];
      end = hours[hours.length - 1];
    }

    return { day, start, end };
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
const daysOfWeek = ['월', '화', '수', '목', '금', '토'];

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

const MiniTimetable = ({
  courses,
  onExportPDF,
  onRemoveCourse,
  onAddToWishlist,
  onViewCourseDetails,
  onClearAll,
  onShowTimetableList,
  timetableRef,
  isExportingPDF
}) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const timeColumnWidth = '40px';
  const dayColumnWidth = `calc((100% - ${timeColumnWidth}) / ${daysOfWeek.length})`;
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
    <div ref={timetableRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mini-timetable">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">내 시간표</h3>
          {courses.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              총 {courses.reduce((total, course) => total + (course.credits || 0), 0)}학점
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          {/* PDF 저장 버튼 */}
          {courses.length > 0 && onExportPDF && (
            <button
              onClick={onExportPDF}
              disabled={isExportingPDF}
              className="p-2 rounded-full transition-colors hover:bg-slate-100 disabled:opacity-60 disabled:hover:bg-transparent"
              title="시간표를 PDF로 저장"
            >
              <Download size={18} />
            </button>
          )}
          {/* 리스트 보기 버튼 */}
          {courses.length > 0 && onShowTimetableList && (
            <button
              onClick={onShowTimetableList}
              className="p-2 rounded-full transition-colors hover:bg-slate-100"
              title="시간표 리스트 보기"
            >
              <CalendarDays size={18} />
            </button>
          )}

          {/* 전체 삭제 버튼 */}
          {
            courses.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                className="p-2 rounded-full transition-colors hover:bg-rose-100"
                title="시간표 전체 삭제"
              >
                <X size={18} className="text-rose-500" />
              </button>
            )
          }
        </div>
      </div>
      <div className="w-full">
        <table className="w-full border-collapse border border-slate-200 table-fixed text-xs text-slate-700">
          <colgroup>
            <col style={{ width: timeColumnWidth }} />
            {daysOfWeek.map(day => (
              <col key={day} style={{ width: dayColumnWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="bg-slate-50 p-1 text-center font-semibold text-[11px] text-slate-500 border border-slate-200"></th>
              {daysOfWeek.map(day => (
                <th key={day} className="bg-slate-50 p-1 text-center font-semibold text-[11px] text-slate-600 border border-slate-200">
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
                <tr
                  key={slot}
                  style={{ height: '24px' }}
                  className={`${isTopBorder ? 'border-t border-slate-200' : ''} ${isNightTopBorder ? 'border-t border-blue-200' : ''}`}
                >
                  {slot.endsWith('-1') && (
                    <td
                      rowSpan={2}
                      className={`text-center p-1 font-medium text-[11px] border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-100 text-blue-600' : 'bg-slate-50 text-slate-500'}`}
                    >
                      {displayTimeSlots[Math.floor(index / 2)]}{slot.startsWith('야') ? '' : '교시'}
                    </td>
                  )}
                  {daysOfWeek.map(day => {
                    const course = grid[day]?.[slot];
                    const isFirstHalf = slot.endsWith('-1');

                    // Case 1: Course exists
                    if (course) {
                      if (course.isStart) {
                        const backgroundColor = course.color || 'bg-blue-100';
                        const borderColor = course.borderColor || 'border-blue-300';
                        const textColor = course.textColor || 'text-slate-900';
                        return (
                          <td
                            key={`${day}-${slot}`}
                            rowSpan={course.span || 1}
                            className={`align-top p-1 ${backgroundColor} ${borderColor} ${textColor} border cursor-pointer transition-colors hover:brightness-95 overflow-hidden`}
                            onClick={(e) => handleCourseClick(e, course)}
                          >
                            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center overflow-hidden">
                              <div className="w-full px-0.5 text-[11px] font-semibold leading-tight break-words overflow-hidden">{course.name}</div>
                              {course.professor && (
                                <div className="w-full px-0.5 text-[10px] leading-none opacity-80 truncate">{course.professor}</div>
                              )}
                            </div>
                          </td>
                        );
                      }
                      // If course exists but not start, it's covered by previous rowSpan
                      return null;
                    }

                    // Case 2: Empty cell
                    const emptyClass = `border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-100' : 'bg-white'}`;

                    if (isFirstHalf) {
                      const nextSlotIndex = index + 1;
                      const nextSlot = timeSlots[nextSlotIndex];
                      const nextCourse = grid[day]?.[nextSlot];

                      // If next slot has a course starting, do NOT merge. Render just this 30min slot.
                      if (nextCourse && nextCourse.isStart) {
                        return (
                          <td key={`${day}-${slot}-empty`} rowSpan={1} className={emptyClass}></td>
                        );
                      }

                      // Otherwise (next slot is empty or part of a spanning course?), merge 1 hour (2 slots)
                      // Note: If next slot is part of a spanning course (not start), that means THIS slot should have been occupied? 
                      // Impossible. If next slot is occupied by spread, this slot must have been occupied too.
                      // So if nextCourse exists and !isStart, it implies this slot is also occupied.
                      // But we are in `if (!course)` block. So this slot is empty.
                      // So nextSlot can only be: Empty, or Start of new course.

                      return (
                        <td key={`${day}-${slot}-empty`} rowSpan={2} className={emptyClass}></td>
                      );
                    } else {
                      // Second half (-2)
                      // We only render if we didn't merge in the previous half.
                      // We merged if previuos slot was empty.
                      const prevSlotIndex = index - 1;
                      const prevSlot = timeSlots[prevSlotIndex];
                      const prevCourse = grid[day]?.[prevSlot];

                      if (!prevCourse) {
                        // Previous slot was empty, so it rendered rowSpan=2 (merged us).
                        // Unless we prevented merge?
                        // We prevented merge if `current` (this slot) was a course start.
                        // But we are here because `course` is null (empty).
                        // So previous slot MUST have merged us.
                        return null;
                      }

                      // Previous slot was occupied (so it didn't merge us).
                      // Render single empty cell.
                      return (
                        <td key={`${day}-${slot}-empty`} rowSpan={1} className={emptyClass}></td>
                      );
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* 범례 */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-white border border-slate-200"></span>
            <span>주간</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-slate-100 border border-slate-200"></span>
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
  <div className="overflow-hidden rounded-lg md:rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
    <div className="p-2 md:p-5">
      <div className="mb-1.5 md:mb-3 flex items-start justify-between gap-1.5">
        <p className="text-sm md:text-lg font-semibold text-slate-900 leading-tight">{course.name} <span className="text-xs md:text-base">({course.credits}학점)</span></p>
        <div className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] md:text-xs font-medium whitespace-nowrap ${course.color} ${course.textColor}`}>
          {course.type}
        </div>
      </div>
      <div className="space-y-0.5 md:space-y-2 text-[11px] md:text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <MapPin size={12} className="text-slate-400 flex-shrink-0" />
          <span className="truncate">{course.department} | {course.professor}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} className="text-slate-400 flex-shrink-0" />
          <span className="text-[11px] md:text-sm">{course.time}</span>
        </div>
      </div>
      <div className="mt-2 md:mt-4 flex justify-end gap-1.5 border-t border-slate-200 pt-2 md:pt-4">
        <button
          onClick={() => onAddToWishlist(course)}
          className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] md:text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          <ShoppingCart size={12} /> 담기
        </button>
        <button
          onClick={() => onAddToTimetable(course)}
          className="inline-flex items-center gap-0.5 rounded-md bg-blue-600 px-2 py-1 text-[11px] md:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
        >
          <Plus size={12} /> 바로 추가
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

  // 페이지 상태 관리
  const [currentView, setCurrentView] = useState('timetable'); // 'login' | 'portal' | 'timetable'

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
  const [isExportingPDF, setIsExportingPDF] = useState(false);


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

  // 희망 공강 요일 설정
  const [freeDays, setFreeDays] = useState([]);

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

  return (
    <div className="bg-[#f6f7fb] min-h-screen font-sans">
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
        onViewCourseDetails={handleViewCourseDetails}
        targetCredits={targetCredits}
        setTargetCredits={setTargetCredits}
        freeDays={freeDays}
        setFreeDays={setFreeDays}
        onRunGenerator={handleRunGenerator}
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
      />
      {showCombinationResults && combinationResults && (
        <TimetableCombinationResults
          results={combinationResults}
          onClose={() => setShowCombinationResults(false)}
          onSelectCombination={handleSelectCombination}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 py-2 md:px-8 md:py-10">
        <header className="mb-2 md:mb-10">
          <div className="flex flex-col gap-2 md:gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg md:text-4xl font-bold tracking-tight text-slate-900">과목 검색</h1>
              <p className="hidden md:block mt-1 text-sm md:text-base text-slate-500">시간표에 바로 담거나 위시리스트로 모아 조합을 만들어 보세요.</p>
            </div>
            <div className="flex-shrink-0">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-semibold text-slate-900">{user.nickname}님</p>
                    <p className="text-xs text-slate-500">{user.major} {user.grade}학년</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-slate-900 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
                  >
                    <LogOut size={14} /> <span className="hidden md:inline">로그아웃</span><span className="md:hidden">로그아웃</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-blue-600 px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
                >
                  <LogIn size={14} /> 로그인
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 검색 바 */}
        <div className="mb-2 md:mb-8 rounded-lg md:rounded-2xl border border-slate-200 bg-white p-2 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <div className="flex-1 flex gap-1.5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 md:left-4 md:top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="과목명 또는 교수명..."
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
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <select
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                className="min-w-[80px] md:min-w-[120px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={filters.subjectType}
                onChange={(e) => setFilters(prev => ({ ...prev, subjectType: e.target.value }))}
                className="min-w-[70px] md:min-w-[100px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {courseTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="min-w-[60px] md:min-w-[90px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              <select
                value={filters.dayOfWeek}
                onChange={(e) => setFilters(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                className="min-w-[60px] md:min-w-[80px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filterDaysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <select
                value={filters.startTime}
                onChange={(e) => setFilters(prev => ({ ...prev, startTime: e.target.value }))}
                className="min-w-[70px] md:min-w-[100px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="min-w-[70px] md:min-w-[100px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-3 lg:gap-10">
          {/* Left: Course List */}
          <main className="lg:col-span-2">
            <div className="mb-2 md:mb-4 flex items-center justify-between">
              <h2 className="text-base md:text-xl font-semibold text-slate-900">
                검색 결과
                {totalElements > 0 && (
                  <span className="text-xs md:text-base text-slate-400">
                    (총 {totalElements.toLocaleString()}개 중 {filteredCourses.length}개 표시)
                  </span>
                )}
                {isLoading && <span className="ml-2 text-xs md:text-sm text-blue-500">로딩 중...</span>}
              </h2>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 md:gap-4">
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
                        총 {wishlist.reduce((acc, c) => acc + c.credits, 0)}학점
                      </div>
                      <button
                        onClick={() => setShowWishlistModal(true)}
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
                        {wishlist.length}개 과목으로 {targetCredits}학점 맞춤 조합 생성
                      </div>
                      <button
                        onClick={handleRunGenerator}
                        disabled={isGenerating}
                        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isGenerating ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            생성 중...
                          </span>
                        ) : (
                          `${targetCredits}학점 조합 만들기`
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
