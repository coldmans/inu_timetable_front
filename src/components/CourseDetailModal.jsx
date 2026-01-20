import React from 'react';
import { X, Clock, Star, MapPin, BookOpen, User, Calendar, Tag, Users, UserCheck, GraduationCap, AlertTriangle, RotateCcw, Plus } from 'lucide-react';

// 시간 정보를 한국어 표시용으로 포맷하는 함수
const formatTimeDisplay = (schedules) => {
  if (!schedules || !Array.isArray(schedules)) return '시간 미정';
  
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
    const day = dayMapping[schedule.dayOfWeek] || schedule.dayOfWeek;
    let timeStr = '';
    
    if (typeof schedule.startTime === 'string' && schedule.startTime.includes(':')) {
      // HH:MM 형식
      timeStr = `${schedule.startTime}~${schedule.endTime}`;
    } else {
      // 교시 번호 형식 (야간 교시 처리 포함)
      let startDisplay = schedule.startTime;
      let endDisplay = schedule.endTime;
      
      if (schedule.startTime >= 10) {
        startDisplay = `야${schedule.startTime - 9}`;
        endDisplay = `야${schedule.endTime - 9}`;
      }
      
      timeStr = `${startDisplay}~${endDisplay}교시`;
    }
    
    return `${day} ${timeStr}`;
  }).join(', ');
};

const CourseDetailModal = ({ isOpen, onClose, course, stats, statsLoading, statsError, onRetryStats, onAddToTimetable }) => {
  if (!isOpen || !course) return null;

  const totalStudents = stats?.totalStudents ?? 0;
  const sameMajor = stats?.sameMajor ?? 0;
  const sameMajorSameGrade = stats?.sameMajorSameGrade ?? 0;
  const updatedAt = stats?.updatedAt || stats?.lastUpdatedAt || null;
  const updatedAtDate = updatedAt ? new Date(updatedAt) : null;
  const updatedAtLabel = updatedAtDate && !Number.isNaN(updatedAtDate.getTime())
    ? updatedAtDate.toLocaleString()
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{course.name}</h2>
                <span className={`px-3 py-1 text-sm font-semibold ${course.color} ${course.textColor} rounded-full`}>
                  {course.type}
                </span>
              </div>
              <p className="text-gray-600">{course.department}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-6">
          <div className="grid gap-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Star className="text-yellow-500" size={20} />
                <div>
                  <p className="text-sm text-gray-600">학점</p>
                  <p className="font-semibold text-lg">{course.credits}학점</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="text-blue-500" size={20} />
                <div>
                  <p className="text-sm text-gray-600">담당교수</p>
                  <p className="font-semibold text-lg">{course.professor}</p>
                </div>
              </div>
            </div>

            {/* 시간 정보 */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="text-blue-500 mt-1" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-blue-600 font-medium mb-1">수업 시간</p>
                  <p className="text-lg font-semibold text-blue-800">
                    {formatTimeDisplay(course.schedules)}
                  </p>
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              {course.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">강의실</p>
                    <p className="font-medium">{course.location}</p>
                  </div>
                </div>
              )}

              {course.grade && (
                <div className="flex items-center gap-3">
                  <BookOpen className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">학년</p>
                    <p className="font-medium">{course.grade}학년</p>
                  </div>
                </div>
              )}

              {course.classMethod && (
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">수업 방식</p>
                    <p className="font-medium">
                      {course.classMethod === 'ONLINE' ? '온라인' : 
                       course.classMethod === 'OFFLINE' ? '오프라인' : 
                       course.classMethod === 'HYBRID' ? '혼합' : course.classMethod}
                    </p>
                  </div>
                </div>
              )}

              {course.isNight && (
                <div className="flex items-center gap-3">
                  <Tag className="text-purple-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">특이사항</p>
                    <p className="font-medium text-purple-600">야간 수업</p>
                  </div>
                </div>
              )}
            </div>

            {/* 수강 인원 통계 */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="text-slate-500" size={20} />
                  <h3 className="text-sm font-semibold text-slate-800">수강 인원 통계</h3>
                </div>
                {statsError && onRetryStats && (
                  <button
                    type="button"
                    onClick={onRetryStats}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white"
                  >
                    <RotateCcw size={14} /> 다시 시도
                  </button>
                )}
              </div>

              {statsLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((key) => (
                    <div key={key} className="rounded-lg bg-white px-3 py-3 shadow-sm">
                      <div className="h-4 w-16 rounded bg-slate-200/80 animate-pulse"></div>
                      <div className="mt-2 h-6 w-20 rounded bg-slate-200/80 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white px-3 py-3 shadow-sm">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Users size={16} className="text-blue-500" /> 총 인원
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{totalStudents.toLocaleString()}명</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-3 shadow-sm">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <UserCheck size={16} className="text-emerald-500" /> 같은 과
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{sameMajor.toLocaleString()}명</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-3 shadow-sm">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <GraduationCap size={16} className="text-purple-500" /> 같은 과·학년
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{sameMajorSameGrade.toLocaleString()}명</p>
                  </div>
                  {updatedAtLabel && (
                    <p className="col-span-full text-right text-[11px] text-slate-400">
                      기준 시각: {updatedAtLabel}
                    </p>
                  )}
                </div>
              ) : statsError ? (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  <AlertTriangle size={16} />
                  <span>{statsError}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">통계 데이터를 준비 중이에요. 잠시 후 다시 열어 주세요.</p>
              )}
            </div>

            {/* 과목 설명 (있는 경우) */}
            {course.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">과목 설명</h3>
                <p className="text-gray-600 leading-relaxed">{course.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
          <div className="flex justify-end gap-3">
            {onAddToTimetable && (
              <button
                onClick={() => {
                  onAddToTimetable(course);
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold"
              >
                <Plus size={18} /> 시간표에 추가
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailModal;
