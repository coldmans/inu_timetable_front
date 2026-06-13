import React, { useEffect, useId, useRef, useState } from 'react';
import { X, LogIn, UserPlus, ChevronDown, CheckCircle2 } from 'lucide-react';
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

const AuthSelect = ({ label, value, options, onChange, active = false, disabled = false, optionWrap = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
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
      onChange(nextValue);
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
        <span className={optionWrap ? 'min-w-0 break-keep leading-snug' : 'truncate'}>{selectedOption?.label}</span>
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
  const gradeOptions = [1, 2, 3, 4].map(grade => ({
    value: grade,
    label: `${grade}학년`,
  }));
  const majorGroupOptions = [
    ...(!activeMajorTab.required ? [{ value: '', label: '선택 안 함' }] : []),
    ...departmentGroups.map(group => ({ value: group.id, label: group.label })),
  ];
  const majorDepartmentOptions = [
    ...(!activeMajorTab.required ? [{ value: '', label: '선택 안 함' }] : []),
    ...activeDepartmentOptions.map(department => ({ value: department, label: department })),
  ];

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
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    학년
                  </label>
                  <AuthSelect
                    label="학년 선택"
                    value={formData.grade}
                    options={gradeOptions}
                    active={formData.grade !== 1}
                    onChange={(nextGrade) => setFormData(prev => ({ ...prev, grade: Number(nextGrade) }))}
                  />
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
                      <AuthSelect
                        label={`${activeMajorTab.label} 단과대 선택`}
                        value={majorGroupSelections[activeMajorType]}
                        options={majorGroupOptions}
                        active={Boolean(majorGroupSelections[activeMajorType])}
                        optionWrap
                        onChange={(nextGroupId) => handleMajorGroupChange(activeMajorType, nextGroupId)}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-medium text-slate-600">학과</span>
                      <AuthSelect
                        label={`${activeMajorTab.label} 학과 선택`}
                        value={majorSelections[activeMajorType]}
                        options={majorDepartmentOptions}
                        active={Boolean(majorSelections[activeMajorType])}
                        disabled={!activeMajorGroup && !activeMajorTab.required}
                        optionWrap
                        onChange={(nextDepartment) => handleMajorDepartmentChange(activeMajorType, nextDepartment)}
                      />
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
