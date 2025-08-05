import React from 'react';
import { X, Clock, User, BookOpen, Trash2, Heart, Info } from 'lucide-react';

// 시간 표시를 위한 헬퍼 함수
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

const TimetableListModal = ({ 
  isOpen, 
  onClose, 
  courses, 
  onRemoveCourse, 
  onAddToWishlist, 
  onViewCourseDetails 
}) => {
  if (!isOpen) return null;

  const totalCredits = courses.reduce((total, course) => total + (course.credits || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">📅 내 시간표</h2>
              <p className="text-gray-600 mt-1">총 {courses.length}개 과목 • {totalCredits}학점</p>
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
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-500 text-lg">아직 추가된 과목이 없어요</p>
              <p className="text-gray-400 text-sm mt-2">과목을 검색해서 시간표에 추가해보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course, index) => (
                <div key={course.id || index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 과목명과 학점 */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{course.name}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold ${course.color} ${course.textColor} rounded-full`}>
                          {course.type}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {course.credits}학점
                        </span>
                      </div>

                      {/* 기본 정보 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User size={16} />
                          <span>{course.professor}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <BookOpen size={16} />
                          <span>{course.department}</span>
                        </div>
                      </div>

                      {/* 시간 정보 */}
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Clock size={16} />
                        <span className="font-medium">{formatTimeDisplay(course.schedules)}</span>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => onViewCourseDetails(course)}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                        title="상세 정보 보기"
                      >
                        <Info size={16} className="text-blue-500" />
                      </button>
                      <button
                        onClick={() => onAddToWishlist(course)}
                        className="p-2 hover:bg-pink-100 rounded-full transition-colors"
                        title="위시리스트에 담기"
                      >
                        <Heart size={16} className="text-pink-500" />
                      </button>
                      <button
                        onClick={() => onRemoveCourse(course)}
                        className="p-2 hover:bg-red-100 rounded-full transition-colors"
                        title="시간표에서 제거"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              총 {courses.length}개 과목 • {totalCredits}학점
            </div>
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

export default TimetableListModal;