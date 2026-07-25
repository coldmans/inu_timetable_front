import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';
import { AuthSelect } from './AuthModal';
import useFocusTrap from '../hooks/useFocusTrap';
import useModalDismiss from '../hooks/useModalDismiss';
import { departmentGroups } from '../utils/timetableUtils';

const accountMajorTabs = [
  { type: 'PRIMARY', label: '전공', required: true },
  { type: 'DOUBLE', label: '복수전공', required: false },
  { type: 'MINOR', label: '부전공', required: false },
];

const emptyAccountMajorSelections = {
  PRIMARY: '',
  DOUBLE: '',
  MINOR: '',
};

const findGroupIdByDepartment = (department) => (
  departmentGroups.find(group => group.departments.includes(department))?.id || ''
);

const buildAccountMajorSelections = (user) => {
  const selections = { ...emptyAccountMajorSelections };

  if (Array.isArray(user?.majors)) {
    user.majors.forEach(major => {
      if (major?.type in selections && major.department) {
        selections[major.type] = major.department;
      }
    });
  }

  if (!selections.PRIMARY && user?.major) {
    selections.PRIMARY = user.major;
  }

  return selections;
};

const buildAccountMajorGroupSelections = (majorSelections) => (
  Object.entries(majorSelections).reduce((acc, [type, department]) => ({
    ...acc,
    [type]: findGroupIdByDepartment(department),
  }), {})
);

const AccountModal = ({ user, onClose, onLogout, onWithdraw, onUpdateProfile, isWithdrawing, isUpdatingProfile }) => {
  const [profileGrade, setProfileGrade] = useState(user?.grade || 1);
  const [activeMajorType, setActiveMajorType] = useState('PRIMARY');
  const [profileMajors, setProfileMajors] = useState(() => buildAccountMajorSelections(user));
  const [profileMajorGroups, setProfileMajorGroups] = useState(() => buildAccountMajorGroupSelections(buildAccountMajorSelections(user)));
  const [profileError, setProfileError] = useState('');
  const isBusy = isWithdrawing || isUpdatingProfile;
  const panelRef = useRef(null);
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  useEffect(() => {
    const nextMajors = buildAccountMajorSelections(user);
    setProfileGrade(user?.grade || 1);
    setProfileMajors(nextMajors);
    setProfileMajorGroups(buildAccountMajorGroupSelections(nextMajors));
    setProfileError('');
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  const displayName = user?.nickname || user?.username || '사용자';
  const displayMajors = Array.isArray(user?.majors) && user.majors.length > 0
    ? user.majors
    : (user?.major ? [{ type: 'PRIMARY', label: '전공', department: user.major }] : []);
  const gradeOptions = [1, 2, 3, 4].map(grade => ({
    value: grade,
    label: `${grade}학년`,
  }));
  const activeMajorTab = accountMajorTabs.find(tab => tab.type === activeMajorType) || accountMajorTabs[0];
  const activeMajorGroup = departmentGroups.find(group => group.id === profileMajorGroups[activeMajorType]);
  const activeDepartmentOptions = activeMajorGroup?.departments || [];
  const majorGroupOptions = [
    ...(!profileMajorGroups[activeMajorType] ? [{ value: '', label: activeMajorTab.required ? '단과대 선택' : '선택 안 함' }] : []),
    ...(!activeMajorTab.required && profileMajorGroups[activeMajorType] ? [{ value: '', label: '선택 안 함' }] : []),
    ...departmentGroups.map(group => ({ value: group.id, label: group.label })),
  ];
  const majorDepartmentOptions = [
    ...(!profileMajors[activeMajorType] ? [{ value: '', label: activeMajorTab.required ? '학과 선택' : '선택 안 함' }] : []),
    ...(!activeMajorTab.required && profileMajors[activeMajorType] ? [{ value: '', label: '선택 안 함' }] : []),
    ...activeDepartmentOptions.map(department => ({ value: department, label: department })),
  ];

  const handleMajorGroupChange = (type, groupId) => {
    const selectedGroup = departmentGroups.find(group => group.id === groupId);
    setProfileMajorGroups(prev => ({ ...prev, [type]: groupId }));
    setProfileMajors(prev => ({
      ...prev,
      [type]: selectedGroup?.departments[0] || '',
    }));
    setProfileError('');
  };

  const handleMajorDepartmentChange = (type, department) => {
    setProfileMajors(prev => ({ ...prev, [type]: department }));
    setProfileError('');
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const selectedMajors = accountMajorTabs
      .map(tab => ({
        type: tab.type,
        department: profileMajors[tab.type],
      }))
      .filter(selection => selection.department);

    if (!profileMajors.PRIMARY) {
      setProfileError('전공 학과를 선택해주세요.');
      return;
    }

    setProfileError('');
    try {
      await onUpdateProfile({
        grade: Number(profileGrade),
        major: profileMajors.PRIMARY,
        majors: selectedMajors,
      });
    } catch {
      // 부모 컴포넌트에서 토스트로 실패 사유를 안내한다.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="account-modal-title" className="modal-panel max-h-[calc(100svh-24px)] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-md sm:rounded-2xl sm:pb-0">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">내 계정</p>
            <h2 id="account-modal-title" className="mt-1 text-lg font-bold text-slate-900">{displayName}님</h2>
            <p className="mt-1 text-sm text-slate-500">{user?.major || '전공 미입력'} {user?.grade ? `${user.grade}학년` : ''}</p>
            {displayMajors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayMajors.map(major => (
                  <span key={`${major.type}-${major.department}`} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {major.label || '전공'} · {major.department}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} className="icon-btn h-9 w-9" aria-label="계정 창 닫기">
            <X size={17} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">회원정보 수정</p>
                <p className="mt-1 text-xs text-slate-500">학년과 전공 학과를 바꿀 수 있어요.</p>
              </div>
              <button
                type="submit"
                disabled={isBusy}
                className="btn-primary h-9 px-3 text-xs"
              >
                {isUpdatingProfile ? '저장 중...' : '저장'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-slate-600">학년</span>
                <AuthSelect
                  label="학년 선택"
                  value={profileGrade}
                  options={gradeOptions}
                  active={Boolean(profileGrade)}
                  disabled={isBusy}
                  onChange={(nextGrade) => setProfileGrade(Number(nextGrade))}
                />
              </label>
              <div className="col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium text-slate-600">선택한 전공</span>
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2">
                  {accountMajorTabs.map(tab => (
                    profileMajors[tab.type] ? (
                      <span key={tab.type} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {tab.label} · {profileMajors[tab.type]}
                      </span>
                    ) : null
                  ))}
                  {!profileMajors.PRIMARY && (
                    <span className="px-1 text-[12px] font-medium text-slate-400">전공 학과를 선택해주세요</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                {accountMajorTabs.map(tab => (
                  <button
                    key={tab.type}
                    type="button"
                    disabled={isBusy}
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
                    value={profileMajorGroups[activeMajorType]}
                    options={majorGroupOptions}
                    active={Boolean(profileMajorGroups[activeMajorType])}
                    disabled={isBusy}
                    optionWrap
                    onChange={(nextGroupId) => handleMajorGroupChange(activeMajorType, nextGroupId)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium text-slate-600">학과</span>
                  <AuthSelect
                    label={`${activeMajorTab.label} 학과 선택`}
                    value={profileMajors[activeMajorType]}
                    options={majorDepartmentOptions}
                    active={Boolean(profileMajors[activeMajorType])}
                    disabled={isBusy || !activeMajorGroup}
                    optionWrap
                    onChange={(nextDepartment) => handleMajorDepartmentChange(activeMajorType, nextDepartment)}
                  />
                </label>
              </div>
            </div>

            {profileError && (
              <p className="mt-3 text-xs font-semibold text-rose-600">{profileError}</p>
            )}
          </form>

          <button
            type="button"
            onClick={onLogout}
            disabled={isBusy}
            className="btn-secondary h-11 w-full justify-center rounded-xl"
          >
            <LogOut size={15} /> 로그아웃
          </button>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white text-rose-600 ring-1 ring-rose-200">
                <AlertTriangle size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-900">회원 탈퇴</p>
                <p className="mt-1 text-sm leading-6 text-rose-800">
                  로그인 정보는 익명화되고 다시 로그인할 수 없습니다. 과목 선택 기록은 누적 이용자와 기능 개선 통계용으로만 남습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={isBusy}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              <Trash2 size={15} /> {isWithdrawing ? '탈퇴 처리 중...' : '회원 탈퇴'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 메인 애플리케이션 컴포넌트
export default AccountModal;
