import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import Pagination from './Pagination';
import { subjectAPI } from '../services/api';
import { departments, grades } from '../utils/timetableUtils';

const ADMIN_PASSWORD_STORAGE_KEY = 'inu_admin_password';

const ADMIN_SUBJECT_TYPES = ['전심', '전핵', '심교', '핵교', '일선', '전기', '기교', '군사학', '교직'];
const ADMIN_SUBJECT_TYPE_FILTERS = ['전체', ...ADMIN_SUBJECT_TYPES];
const CLASS_METHODS = [
  { value: 'ONLINE', label: '온라인' },
  { value: 'OFFLINE', label: '오프라인' },
  { value: 'BLENDED', label: '혼합' }
];
const CLASS_METHOD_VALUES = CLASS_METHODS.map(method => method.value);
const DAY_OPTIONS = ['월', '화', '수', '목', '금', '토', '일'];

const dayMapping = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일'
};

const createEmptySubjectForm = () => ({
  subjectName: '',
  credits: '3',
  professor: '',
  department: '',
  grade: '1',
  subjectType: '전심',
  classMethod: 'OFFLINE',
  isNight: false,
  schedules: []
});

const createEmptyImportForm = () => ({
  semester: '',
  file: null,
  deactivateMissing: false
});

const normalizeDayOfWeek = (dayOfWeek) => {
  if (!dayOfWeek) return '월';
  const normalized = String(dayOfWeek).toUpperCase();
  return dayMapping[normalized] || dayOfWeek;
};

const toSubjectForm = (subject) => ({
  subjectName: subject?.subjectName || '',
  credits: String(subject?.credits ?? 3),
  professor: subject?.professor || '',
  department: subject?.department || '',
  grade: String(subject?.grade ?? 1),
  subjectType: ADMIN_SUBJECT_TYPES.includes(subject?.subjectType) ? subject.subjectType : '전심',
  classMethod: CLASS_METHOD_VALUES.includes(subject?.classMethod) ? subject.classMethod : 'OFFLINE',
  isNight: Boolean(subject?.isNight),
  schedules: Array.isArray(subject?.schedules)
    ? subject.schedules.map(schedule => ({
      dayOfWeek: normalizeDayOfWeek(schedule.dayOfWeek),
      startTime: String(schedule.startTime ?? ''),
      endTime: String(schedule.endTime ?? '')
    }))
    : []
});

const getClassMethodLabel = (classMethod) => {
  const method = CLASS_METHODS.find(item => item.value === classMethod);
  return method ? method.label : classMethod || '-';
};

const formatScheduleSummary = (schedules) => {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return '시간 없음';
  }

  return schedules
    .map(schedule => `${normalizeDayOfWeek(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`)
    .join(', ');
};

const parseGradeFilter = (grade) => {
  if (!grade || grade === '전체') return undefined;
  return Number(String(grade).replace('학년', ''));
};

const buildFilterParams = (filters) => ({
  subjectName: filters.subjectName.trim(),
  professor: filters.professor.trim(),
  department: filters.department,
  grade: parseGradeFilter(filters.grade),
  subjectType: filters.subjectType
});

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const validateSubjectForm = (formData) => {
  if (isBlank(formData.subjectName)) return '과목명을 입력해주세요.';
  if (isBlank(formData.professor)) return '교수명을 입력해주세요.';
  if (isBlank(formData.department)) return '학과를 입력해주세요.';

  const credits = Number(formData.credits);
  if (!Number.isFinite(credits) || credits <= 0) return '학점은 0보다 큰 숫자로 입력해주세요.';

  const grade = Number(formData.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 4) return '학년은 1~4 사이로 선택해주세요.';

  if (!ADMIN_SUBJECT_TYPES.includes(formData.subjectType)) return '이수구분을 선택해주세요.';
  if (!CLASS_METHOD_VALUES.includes(formData.classMethod)) return '수업 방식을 선택해주세요.';

  for (let index = 0; index < formData.schedules.length; index += 1) {
    const schedule = formData.schedules[index];
    const rowNumber = index + 1;

    if (!DAY_OPTIONS.includes(schedule.dayOfWeek)) {
      return `${rowNumber}번째 시간표의 요일을 선택해주세요.`;
    }

    if (isBlank(schedule.startTime) || isBlank(schedule.endTime)) {
      return `${rowNumber}번째 시간표의 시작/종료 교시를 입력해주세요.`;
    }

    const startTime = Number(schedule.startTime);
    const endTime = Number(schedule.endTime);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return `${rowNumber}번째 시간표의 교시는 숫자로 입력해주세요.`;
    }

    if (endTime <= startTime) {
      return `${rowNumber}번째 시간표의 종료 교시는 시작 교시보다 커야 합니다.`;
    }
  }

  return '';
};

const toSubjectPayload = (formData) => ({
  subjectName: formData.subjectName.trim(),
  credits: Number(formData.credits),
  professor: formData.professor.trim(),
  department: formData.department.trim(),
  grade: Number(formData.grade),
  subjectType: formData.subjectType,
  classMethod: formData.classMethod,
  isNight: Boolean(formData.isNight),
  schedules: formData.schedules.map(schedule => ({
    dayOfWeek: schedule.dayOfWeek,
    startTime: Number(schedule.startTime),
    endTime: Number(schedule.endTime)
  }))
});

const getAdminErrorMessage = (error, fallbackMessage) => {
  if (error?.status === 400) {
    return '입력값 오류입니다. 필수값과 시간표 교시를 확인해주세요.';
  }

  if (error?.status === 403) {
    return '관리자 비밀번호가 올바르지 않습니다.';
  }

  if (error?.status === 409) {
    return '사용자 데이터에서 사용 중인 과목이라 삭제할 수 없습니다.';
  }

  return error?.message || fallbackMessage;
};

const getImportErrorMessage = (error, fallbackMessage) => {
  if (error?.status === 400) {
    return '입력값 오류입니다. 학기, 파일 형식, 옵션을 확인해주세요.';
  }

  if (error?.status === 403) {
    return '관리자 비밀번호가 올바르지 않습니다.';
  }

  return error?.message || fallbackMessage;
};

const formatImportPreviewItem = (item) => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '-';

  const title = item.subjectName || item.name || item.title || item.code || item.id || '이름 없는 과목';
  const meta = [
    item.department,
    item.professor,
    item.semester,
    item.reason,
    item.message
  ].filter(Boolean);

  return meta.length > 0 ? `${title} · ${meta.join(' · ')}` : String(title);
};

const getPreviewList = (preview, key) => (
  Array.isArray(preview?.[key]) ? preview[key] : []
);

const AdminSubjectManager = ({ showToast }) => {
  const [adminPassword, setAdminPassword] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [filters, setFilters] = useState({
    subjectName: '',
    professor: '',
    department: '전체',
    grade: '전체',
    subjectType: '전체'
  });
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(20);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState(createEmptySubjectForm);
  const [formError, setFormError] = useState('');
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [importForm, setImportForm] = useState(createEmptyImportForm);
  const [importError, setImportError] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  useEffect(() => {
    loadSubjects(0);
  }, []);

  useEffect(() => {
    if (!isFormOpen && !subjectToDelete && !isImportConfirmOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormOpen, subjectToDelete, isImportConfirmOpen]);

  const notify = (message, type = 'success') => {
    if (showToast) {
      showToast(message, type);
    }
  };

  const loadSubjects = async (page = 0, nextFilters = filters) => {
    try {
      setIsLoading(true);
      const response = await subjectAPI.filter(buildFilterParams(nextFilters), page, pageSize);

      if (response && Array.isArray(response.content)) {
        setSubjects(response.content);
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
        setCurrentPage(response.number || 0);
      } else if (Array.isArray(response)) {
        setSubjects(response);
        setTotalPages(1);
        setTotalElements(response.length);
        setCurrentPage(0);
      } else {
        setSubjects([]);
        setTotalPages(0);
        setTotalElements(0);
        setCurrentPage(0);
      }
    } catch (error) {
      notify(`과목 목록을 불러오지 못했습니다: ${error.message}`, 'error');
      setSubjects([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (event) => {
    const nextValue = event.target.value;
    setAdminPassword(nextValue);

    try {
      if (nextValue) {
        sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, nextValue);
      } else {
        sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
      }
    } catch {
      notify('관리자 비밀번호 저장에 실패했습니다.', 'warning');
    }
  };

  const clearAdminPassword = () => {
    setAdminPassword('');
    try {
      sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
    } catch {
      // sessionStorage가 막힌 환경에서는 입력 상태만 초기화한다.
    }
  };

  const executeSearch = () => {
    loadSubjects(0);
  };

  const resetFilters = () => {
    const nextFilters = {
      subjectName: '',
      professor: '',
      department: '전체',
      grade: '전체',
      subjectType: '전체'
    };

    setFilters(nextFilters);
    loadSubjects(0, nextFilters);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };

  const handlePageChange = (nextPage) => {
    loadSubjects(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCreateModal = () => {
    setFormMode('create');
    setEditingSubject(null);
    setSubjectForm(createEmptySubjectForm());
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = async (subject) => {
    try {
      setDetailLoadingId(subject.id);
      const detail = await subjectAPI.getById(subject.id);
      setFormMode('edit');
      setEditingSubject(detail);
      setSubjectForm(toSubjectForm(detail));
      setFormError('');
      setIsFormOpen(true);
    } catch (error) {
      notify(`과목 상세를 불러오지 못했습니다: ${error.message}`, 'error');
    } finally {
      setDetailLoadingId(null);
    }
  };

  const closeFormModal = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingSubject(null);
    setFormError('');
  };

  const updateFormField = (field, value) => {
    setSubjectForm(prev => ({ ...prev, [field]: value }));
  };

  const addSchedule = () => {
    setSubjectForm(prev => ({
      ...prev,
      schedules: [...prev.schedules, { dayOfWeek: '월', startTime: '1', endTime: '2' }]
    }));
  };

  const updateSchedule = (index, field, value) => {
    setSubjectForm(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, scheduleIndex) => (
        scheduleIndex === index ? { ...schedule, [field]: value } : schedule
      ))
    }));
  };

  const removeSchedule = (index) => {
    setSubjectForm(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, scheduleIndex) => scheduleIndex !== index)
    }));
  };

  const handleSubmitSubject = async (event) => {
    event.preventDefault();

    const validationMessage = validateSubjectForm(subjectForm);
    if (validationMessage) {
      setFormError(validationMessage);
      notify(validationMessage, 'warning');
      return;
    }

    if (!adminPassword.trim()) {
      const passwordMessage = '관리자 비밀번호를 입력해주세요.';
      setFormError(passwordMessage);
      notify(passwordMessage, 'warning');
      return;
    }

    const payload = toSubjectPayload(subjectForm);
    const mode = formMode;

    try {
      setIsSaving(true);
      if (mode === 'create') {
        await subjectAPI.create(payload, adminPassword);
      } else {
        await subjectAPI.update(editingSubject.id, payload, adminPassword);
      }

      notify(mode === 'create' ? '과목을 생성했습니다.' : '과목을 수정했습니다.');
      setIsFormOpen(false);
      setEditingSubject(null);
      setFormError('');
      await loadSubjects(mode === 'create' ? 0 : currentPage);
    } catch (error) {
      const message = getAdminErrorMessage(
        error,
        mode === 'create' ? '과목 생성에 실패했습니다.' : '과목 수정에 실패했습니다.'
      );
      setFormError(message);
      notify(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (subject) => {
    setSubjectToDelete(subject);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setSubjectToDelete(null);
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;

    if (!adminPassword.trim()) {
      notify('관리자 비밀번호를 입력해주세요.', 'warning');
      return;
    }

    try {
      setIsDeleting(true);
      await subjectAPI.delete(subjectToDelete.id, adminPassword);
      notify('과목을 삭제했습니다.');
      setSubjectToDelete(null);
      await loadSubjects(currentPage);
    } catch (error) {
      notify(getAdminErrorMessage(error, '과목 삭제에 실패했습니다.'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const updateImportField = (field, value) => {
    setImportForm(prev => ({ ...prev, [field]: value }));
  };

  const validateImportForm = () => {
    if (!adminPassword.trim()) {
      return '관리자 비밀번호를 입력해주세요.';
    }

    if (!importForm.semester.trim()) {
      return '학기를 입력해주세요.';
    }

    if (!importForm.file) {
      return 'Excel 파일을 선택해주세요.';
    }

    return '';
  };

  const handlePreviewImport = async (event) => {
    event.preventDefault();

    const validationMessage = validateImportForm();
    if (validationMessage) {
      setImportError(validationMessage);
      notify(validationMessage, 'warning');
      return;
    }

    try {
      setIsPreviewLoading(true);
      setImportError('');
      setPreviewResult(null);
      setIsImportConfirmOpen(false);

      const response = await subjectAPI.importPreview({
        semester: importForm.semester.trim(),
        file: importForm.file,
        deactivateMissing: importForm.deactivateMissing
      }, adminPassword);

      setPreviewResult(response);
      notify('가져오기 미리보기를 불러왔습니다.');
    } catch (error) {
      const message = getImportErrorMessage(error, '가져오기 미리보기를 불러오지 못했습니다.');
      setImportError(message);
      notify(message, 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const openImportConfirmModal = () => {
    if (!previewResult) return;
    setIsImportConfirmOpen(true);
  };

  const closeImportConfirmModal = () => {
    if (isApplyingImport) return;
    setIsImportConfirmOpen(false);
  };

  const handleApplyImport = async () => {
    const validationMessage = validateImportForm();
    if (validationMessage) {
      setImportError(validationMessage);
      notify(validationMessage, 'warning');
      return;
    }

    try {
      setIsApplyingImport(true);
      await subjectAPI.importApply({
        semester: importForm.semester.trim(),
        file: importForm.file,
        deactivateMissing: importForm.deactivateMissing
      }, adminPassword);

      notify('공식 강의시간표 Excel 반영을 완료했습니다.');
      setIsImportConfirmOpen(false);
      await loadSubjects(0);
    } catch (error) {
      const message = getImportErrorMessage(error, '공식 강의시간표 반영에 실패했습니다.');
      setImportError(message);
      notify(message, 'error');
    } finally {
      setIsApplyingImport(false);
    }
  };

  const addedSubjects = getPreviewList(previewResult, 'addedSubjects');
  const modifiedSubjects = getPreviewList(previewResult, 'modifiedSubjects');
  const removedSubjects = getPreviewList(previewResult, 'removedSubjects');
  const warnings = getPreviewList(previewResult, 'warnings');

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="rounded-lg md:rounded-2xl border border-slate-200 bg-white p-3 md:p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">과목명</span>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={filters.subjectName}
                  onChange={(event) => setFilters(prev => ({ ...prev, subjectName: event.target.value }))}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full rounded-lg border border-slate-200 bg-white px-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="자료구조"
                />
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">교수명</span>
              <input
                type="text"
                value={filters.professor}
                onChange={(event) => setFilters(prev => ({ ...prev, professor: event.target.value }))}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="김교수"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">학과</span>
              <select
                value={filters.department}
                onChange={(event) => setFilters(prev => ({ ...prev, department: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">학년</span>
              <select
                value={filters.grade}
                onChange={(event) => setFilters(prev => ({ ...prev, grade: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">이수구분</span>
              <select
                value={filters.subjectType}
                onChange={(event) => setFilters(prev => ({ ...prev, subjectType: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ADMIN_SUBJECT_TYPE_FILTERS.map(subjectType => (
                  <option key={subjectType} value={subjectType}>{subjectType}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={executeSearch}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              검색
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              초기화
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <Plus size={16} />
              생성
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg md:rounded-2xl border border-slate-200 bg-white p-3 md:p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base md:text-xl font-semibold text-slate-900">공식 강의시간표 Excel 가져오기</h2>
            <p className="text-xs md:text-sm text-slate-500">
              관리자 페이지에서만 공식 강의시간표 Excel 미리보기와 반영을 진행할 수 있습니다.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <FileSpreadsheet size={14} />
            preview 후 apply
          </div>
        </div>

        <form onSubmit={handlePreviewImport} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">학기</span>
              <input
                type="text"
                value={importForm.semester}
                onChange={(event) => updateImportField('semester', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2026-1"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">xlsx 파일</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  updateImportField('file', nextFile);
                  setPreviewResult(null);
                  setImportError('');
                }}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <input
              type="checkbox"
              checked={importForm.deactivateMissing}
              onChange={(event) => updateImportField('deactivateMissing', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              <span className="block font-semibold text-slate-900">Excel에 없는 기존 공식 과목을 비활성화</span>
              <span className="block text-xs text-slate-500">
                처음 운영 반영 시에는 레거시 데이터 검토를 위해 기본값 `false`를 유지하는 편이 안전합니다.
              </span>
            </span>
          </label>

          {importError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isPreviewLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isPreviewLoading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              미리보기 생성
            </button>
            {previewResult && (
              <button
                type="button"
                onClick={openImportConfirmModal}
                disabled={isApplyingImport}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                확인 후 반영
              </button>
            )}
          </div>
        </form>

        {previewResult && (
          <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">미리보기 결과</h3>
                <p className="text-xs text-slate-500">
                  학기 {previewResult.semester || importForm.semester} · 총 {previewResult.totalRows ?? 0}행 · 변경 미리보기
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">추가 {previewResult.addedCount ?? addedSubjects.length}</div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700">수정 {previewResult.modifiedCount ?? modifiedSubjects.length}</div>
                <div className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700">비활성화 {previewResult.removedCount ?? removedSubjects.length}</div>
                <div className="rounded-lg bg-slate-200 px-3 py-2 font-semibold text-slate-700">유지 {previewResult.unchangedCount ?? 0}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-lg border border-emerald-100 bg-white p-3">
                <h4 className="text-sm font-semibold text-emerald-700">추가 예정 과목</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {addedSubjects.length > 0 ? addedSubjects.map((item, index) => (
                    <li key={`added-${index}`} className="rounded-md bg-emerald-50 px-2 py-1">
                      {formatImportPreviewItem(item)}
                    </li>
                  )) : <li className="text-slate-400">추가 예정 과목이 없습니다.</li>}
                </ul>
              </div>

              <div className="rounded-lg border border-amber-100 bg-white p-3">
                <h4 className="text-sm font-semibold text-amber-700">수정 예정 과목</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {modifiedSubjects.length > 0 ? modifiedSubjects.map((item, index) => (
                    <li key={`modified-${index}`} className="rounded-md bg-amber-50 px-2 py-1">
                      {formatImportPreviewItem(item)}
                    </li>
                  )) : <li className="text-slate-400">수정 예정 과목이 없습니다.</li>}
                </ul>
              </div>

              <div className="rounded-lg border border-rose-100 bg-white p-3">
                <h4 className="text-sm font-semibold text-rose-700">비활성화 예정 과목</h4>
                <p className="mt-1 text-xs text-slate-500">물리 삭제가 아니라 `active=false` 대상입니다.</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {removedSubjects.length > 0 ? removedSubjects.map((item, index) => (
                    <li key={`removed-${index}`} className="rounded-md bg-rose-50 px-2 py-1">
                      {formatImportPreviewItem(item)}
                    </li>
                  )) : <li className="text-slate-400">비활성화 예정 과목이 없습니다.</li>}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-slate-700">경고</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {warnings.length > 0 ? warnings.map((item, index) => (
                    <li key={`warning-${index}`} className="rounded-md bg-slate-100 px-2 py-1">
                      {formatImportPreviewItem(item)}
                    </li>
                  )) : <li className="text-slate-400">경고가 없습니다.</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg md:rounded-2xl border border-slate-200 bg-white p-3 md:p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base md:text-xl font-semibold text-slate-900">과목 목록</h2>
            <p className="text-xs md:text-sm text-slate-500">
              총 {totalElements.toLocaleString()}개
              {isLoading && <span className="ml-2 text-blue-500">불러오는 중...</span>}
            </p>
          </div>
          <label className="flex w-full flex-col gap-1 md:w-80">
            <span className="text-xs font-semibold text-slate-500">관리자 비밀번호</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={handlePasswordChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-9 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호"
                />
              </div>
              <button
                type="button"
                onClick={clearAdminPassword}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                지우기
              </button>
            </div>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">과목명</th>
                <th className="px-3 py-3">교수</th>
                <th className="px-3 py-3">학과</th>
                <th className="px-3 py-3">학년</th>
                <th className="px-3 py-3">구분</th>
                <th className="px-3 py-3">학점</th>
                <th className="px-3 py-3">방식</th>
                <th className="px-3 py-3">시간</th>
                <th className="px-3 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(subject => (
                <tr key={subject.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                  <td className="px-3 py-3 text-xs text-slate-400">{subject.id}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{subject.subjectName}</p>
                    {subject.isNight && (
                      <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        야간
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">{subject.professor || '-'}</td>
                  <td className="px-3 py-3">{subject.department || '-'}</td>
                  <td className="px-3 py-3">{subject.grade ? `${subject.grade}학년` : '-'}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {subject.subjectType || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3">{subject.credits ?? '-'}학점</td>
                  <td className="px-3 py-3">{getClassMethodLabel(subject.classMethod)}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{formatScheduleSummary(subject.schedules)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(subject)}
                        disabled={detailLoadingId === subject.id}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {detailLoadingId === subject.id ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(subject)}
                        className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && subjects.length === 0 && (
                <tr>
                  <td colSpan="10" className="px-3 py-12 text-center text-sm text-slate-400">
                    조건에 맞는 과목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-subject-form-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="admin-subject-form-title" className="text-lg font-semibold text-slate-900">
                  {formMode === 'create' ? '과목 생성' : '과목 수정'}
                </h2>
                <p className="text-sm text-slate-500">
                  {formMode === 'edit' && editingSubject ? `ID ${editingSubject.id}` : '새 과목'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSaving}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitSubject} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {formError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">과목명</span>
                    <input
                      type="text"
                      value={subjectForm.subjectName}
                      onChange={(event) => updateFormField('subjectName', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">교수명</span>
                    <input
                      type="text"
                      value={subjectForm.professor}
                      onChange={(event) => updateFormField('professor', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">학과</span>
                    <input
                      type="text"
                      value={subjectForm.department}
                      onChange={(event) => updateFormField('department', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">학점</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={subjectForm.credits}
                      onChange={(event) => updateFormField('credits', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">학년</span>
                    <select
                      value={subjectForm.grade}
                      onChange={(event) => updateFormField('grade', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">1학년</option>
                      <option value="2">2학년</option>
                      <option value="3">3학년</option>
                      <option value="4">4학년</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">이수구분</span>
                    <select
                      value={subjectForm.subjectType}
                      onChange={(event) => updateFormField('subjectType', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ADMIN_SUBJECT_TYPES.map(subjectType => (
                        <option key={subjectType} value={subjectType}>{subjectType}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">수업 방식</span>
                    <select
                      value={subjectForm.classMethod}
                      onChange={(event) => updateFormField('classMethod', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CLASS_METHODS.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={subjectForm.isNight}
                      onChange={(event) => updateFormField('isNight', event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">야간 수업</span>
                  </label>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">시간표</h3>
                    <button
                      type="button"
                      onClick={addSchedule}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <Plus size={14} />
                      시간 추가
                    </button>
                  </div>

                  <div className="space-y-2">
                    {subjectForm.schedules.map((schedule, index) => (
                      <div key={`${index}-${schedule.dayOfWeek}`} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[120px_1fr_1fr_auto] md:items-end">
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-500">요일</span>
                          <select
                            value={schedule.dayOfWeek}
                            onChange={(event) => updateSchedule(index, 'dayOfWeek', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {DAY_OPTIONS.map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-500">시작 교시</span>
                          <input
                            type="number"
                            step="0.5"
                            value={schedule.startTime}
                            onChange={(event) => updateSchedule(index, 'startTime', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-slate-500">종료 교시</span>
                          <input
                            type="number"
                            step="0.5"
                            value={schedule.endTime}
                            onChange={(event) => updateSchedule(index, 'endTime', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeSchedule(index)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                        >
                          <Trash2 size={15} />
                          삭제
                        </button>
                      </div>
                    ))}

                    {subjectForm.schedules.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                        등록된 시간이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {formMode === 'create' ? '생성하기' : '수정하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-subject-delete-title"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-50 p-2 text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 id="admin-subject-delete-title" className="text-lg font-semibold text-slate-900">과목 삭제</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {subjectToDelete.subjectName} 과목을 삭제합니다.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteSubject}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportConfirmOpen && previewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-subject-import-confirm-title"
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h2 id="admin-subject-import-confirm-title" className="text-lg font-semibold text-slate-900">
                  공식 강의시간표 반영
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  미리보기 결과를 확인했고, 같은 파일과 학기 설정으로 실제 반영을 진행합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">학기</span> {previewResult.semester || importForm.semester}</p>
              <p className="mt-1"><span className="font-semibold text-slate-900">파일</span> {importForm.file?.name || '-'}</p>
              <p className="mt-1"><span className="font-semibold text-slate-900">비활성화 옵션</span> {importForm.deactivateMissing ? '사용' : '사용 안 함'}</p>
              <p className="mt-3 text-xs text-slate-500">
                추가 {previewResult.addedCount ?? addedSubjects.length}건, 수정 {previewResult.modifiedCount ?? modifiedSubjects.length}건,
                비활성화 {previewResult.removedCount ?? removedSubjects.length}건이 반영됩니다.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeImportConfirmModal}
                disabled={isApplyingImport}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApplyImport}
                disabled={isApplyingImport}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isApplyingImport ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                반영하기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminSubjectManager;
