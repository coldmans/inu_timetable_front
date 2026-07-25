import { fetchWithUserCsrf, handleResponse } from './api';

const ADMIN_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || '/admin/api';

const getAdminHeaders = () => ({
  'Content-Type': 'application/json',
});

const createSubjectImportFormData = (semester, file, deactivateMissing = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('semester', semester);
  formData.append('deactivateMissing', String(Boolean(deactivateMissing)));
  return formData;
};

export const adminSubjectAPI = {
  getById: async (subjectId) => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects/${subjectId}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  create: async (subjectData) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/subjects`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(subjectData),
    });
    return handleResponse(response);
  },

  update: async (subjectId, subjectData) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/subjects/${subjectId}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(subjectData),
    });
    return handleResponse(response);
  },

  delete: async (subjectId) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/subjects/${subjectId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  importPreview: async ({ semester, file, deactivateMissing }) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/subjects/import/preview`, {
      method: 'POST',
      body: createSubjectImportFormData(semester, file, deactivateMissing),
    });
    return handleResponse(response);
  },

  importApply: async ({ semester, file, deactivateMissing }) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/subjects/import/apply`, {
      method: 'POST',
      body: createSubjectImportFormData(semester, file, deactivateMissing),
    });
    return handleResponse(response);
  },

  // 등록된 학기 목록(최신순). 관리자 인증 필요.
  getSemesters: async () => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects/semesters`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

export const adminSettingsAPI = {
  // 현재 학기 전환. 성공 시 { semester } 반환.
  updateCurrentSemester: async (semester) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/settings/current-semester`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({ semester }),
    });
    return handleResponse(response);
  },
};

export const adminAuthAPI = {
  login: async ({ username, password }) => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  me: async () => {
    const response = await fetch(`${ADMIN_BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetchWithUserCsrf(`${ADMIN_BASE_URL}/auth/logout`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
};
