import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// 학과 목록 (App.jsx와 동일)
const departments = [
  '전체',
  '&Service',
  'Global',
  'HUSS(타대학)',
  'HUSS포용사회이니셔티브학부',
  'IBE전공',
  'Trade',
  '건설환경공학전공',
  '건축공학전공',
  '경영학부',
  '경제학과',
  '공연예술학과',
  '광전자공학전공(연계)',
  '교양',
  '교직',
  '국어교육과',
  '국어국문학과',
  '국제개발협력연계전공',
  '군사학',
  '기계공학과',
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
  '무역학부(야)',
  '문헌정보학과',
  '물류학전공(연계)',
  '물리학과',
  '미디어커뮤니케이션학과',
  '미래교육디자인연계전공',
  '미래자동차연계전공',
  '바이오-로봇시스템공학과',
  '반도체융합전공',
  '법학부',
  '분자의생명전공',
  '불어불문학과',
  '사회복지학과',
  '산경(야)',
  '산업경영공학과',
  '생명공학부',
  '생명공학전공',
  '생명과학부',
  '생명과학전공',
  '서양화전공',
  '세무회계학과',
  '소비자학과',
  '소셜데이터사이언스연계전공',
  '수학과',
  '수학교육과',
  '스마트물류공학전공',
  '스포츠과학부',
  '신소재공학과',
  '심화교양',
  '안전공학과',
  '에너지화학공학과',
  '역사교육과',
  '영어교육과',
  '영어영문학과',
  '운동건강학부',
  '유아교육과',
  '윤리교육과',
  '인문문화예술기획연계전공',
  '일본지역문화학과',
  '일선',
  '일어교육과',
  '임베디드시스템공학과',
  '자유전공학부',
  '전기공학과',
  '전자(야)',
  '전자공학과',
  '전자공학부',
  '전자공학전공',
  '정보통신공학과',
  '정치외교학과',
  '조형예술학부',
  '중국학과',
  '중어중국학과',
  '창의인재개발학과',
  '창의적디자인연계전공',
  '체육교육과',
  '컴퓨터공학부',
  '패션산업학과',
  '한국화전공',
  '해양학과',
  '행정학과',
  '화학과',
  '환경',
  '환경공학전공'
];

const AuthModal = ({ isOpen, onClose, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    grade: 1,
    major: '컴퓨터공학부',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grade' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login({
          username: formData.username,
          password: formData.password,
        });
        showToast('로그인 성공!');
      } else {
        await register(formData);
        showToast('회원가입 및 로그인 완료!');
      }
      onClose();
      setFormData({
        username: '',
        password: '',
        grade: 1,
        major: '컴퓨터공학부',
      });
    } catch (error) {
      showToast(error.message, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? '로그인' : '회원가입'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="아이디를 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    학년
                  </label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                    <option value={4}>4학년</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전공
                  </label>
                  <select
                    name="major"
                    value={formData.major}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.slice(1).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              '처리 중...'
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? '로그인' : '회원가입'}
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;