import React, { useState } from 'react';
import { X, LogIn, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { departmentGroups } from '../utils/timetableUtils';

const majorTabs = [
  { type: 'PRIMARY', label: '전공', required: true },
  { type: 'DOUBLE', label: '복수전공', required: false },
  { type: 'MINOR', label: '부전공', required: false },
];

const defaultMajorSelections = {
  PRIMARY: '컴퓨터공학부',
  DOUBLE: '',
  MINOR: '',
};

const findGroupIdByDepartment = (department) => (
  departmentGroups.find(group => group.departments.includes(department))?.id || departmentGroups[0]?.id || ''
);

const defaultMajorGroupSelections = {
  PRIMARY: findGroupIdByDepartment(defaultMajorSelections.PRIMARY),
  DOUBLE: '',
  MINOR: '',
};

const AuthModal = ({ isOpen, onClose, showToast, onRegisterSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    grade: 1,
  });
  const [activeMajorType, setActiveMajorType] = useState('PRIMARY');
  const [majorSelections, setMajorSelections] = useState(defaultMajorSelections);
  const [majorGroupSelections, setMajorGroupSelections] = useState(defaultMajorGroupSelections);
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
        const selectedMajors = majorTabs
          .map(tab => ({
            type: tab.type,
            department: majorSelections[tab.type],
          }))
          .filter(selection => selection.department);

        await register({
          ...formData,
          major: majorSelections.PRIMARY,
          majors: selectedMajors,
        });
        showToast('회원가입 및 로그인 완료!');
        onRegisterSuccess?.();
      }
      onClose();
      setFormData({
        username: '',
        password: '',
        grade: 1,
      });
      setActiveMajorType('PRIMARY');
      setMajorSelections(defaultMajorSelections);
      setMajorGroupSelections(defaultMajorGroupSelections);
    } catch (error) {
      showToast(error.message, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMajorGroupChange = (type, groupId) => {
    const selectedGroup = departmentGroups.find(group => group.id === groupId);
    setMajorGroupSelections(prev => ({ ...prev, [type]: groupId }));
    setMajorSelections(prev => ({
      ...prev,
      [type]: selectedGroup?.departments[0] || '',
    }));
  };

  const handleMajorDepartmentChange = (type, department) => {
    setMajorSelections(prev => ({ ...prev, [type]: department }));
  };

  if (!isOpen) return null;

  const activeMajorTab = majorTabs.find(tab => tab.type === activeMajorType) || majorTabs[0];
  const activeMajorGroup = departmentGroups.find(group => group.id === majorGroupSelections[activeMajorType]);
  const activeDepartmentOptions = activeMajorGroup?.departments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="modal-panel w-full max-w-[460px] rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold tracking-tight text-slate-900">
              {isLogin ? '로그인' : '회원가입'}
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              {isLogin ? 'INU 시간표 계정으로 계속하세요.' : '몇 초면 끝나요. 위시리스트와 시간표가 저장됩니다.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="icon-btn -mr-1 -mt-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5">
          <div className="space-y-3.5">
            <div>
              <label htmlFor="auth-username" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                아이디
              </label>
              <input
                id="auth-username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                autoComplete="username"
                className="field h-11"
                placeholder="아이디를 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                비밀번호
              </label>
              <input
                id="auth-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="field h-11"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {!isLogin && (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="auth-grade" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    학년
                  </label>
                  <div className="relative">
                    <select
                      id="auth-grade"
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      required
                      className="field h-11 appearance-none pr-7"
                    >
                      <option value={1}>1학년</option>
                      <option value={2}>2학년</option>
                      <option value={3}>3학년</option>
                      <option value={4}>4학년</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    선택한 전공
                  </label>
                  <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                    {majorTabs.map(tab => (
                      majorSelections[tab.type] ? (
                        <span key={tab.type} className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {tab.label} · {majorSelections[tab.type]}
                        </span>
                      ) : null
                    ))}
                  </div>
                </div>
              </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                    {majorTabs.map(tab => (
                      <button
                        key={tab.type}
                        type="button"
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
                      <div className="relative">
                        <select
                          value={majorGroupSelections[activeMajorType]}
                          onChange={(event) => handleMajorGroupChange(activeMajorType, event.target.value)}
                          required={activeMajorTab.required}
                          className="field h-10 appearance-none pr-8 text-sm"
                        >
                          {!activeMajorTab.required && <option value="">선택 안 함</option>}
                          {departmentGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-medium text-slate-600">학과</span>
                      <div className="relative">
                        <select
                          value={majorSelections[activeMajorType]}
                          onChange={(event) => handleMajorDepartmentChange(activeMajorType, event.target.value)}
                          required={activeMajorTab.required}
                          disabled={!activeMajorGroup}
                          className="field h-10 appearance-none pr-8 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {!activeMajorTab.required && <option value="">선택 안 함</option>}
                          {activeDepartmentOptions.map(department => (
                            <option key={department} value={department}>{department}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary mt-5 h-11 w-full text-[15px]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                처리 중...
              </span>
            ) : (
              <>
                {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
                {isLogin ? '로그인' : '가입하고 시작하기'}
              </>
            )}
          </button>

          <p className="mt-4 text-center text-[13px] text-slate-500">
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
