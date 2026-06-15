import { handleResponse } from './api';

const ADMIN_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || '/admin/api';

const getAdminHeaders = (csrfToken) => ({
  'Content-Type': 'application/json',
  'X-Admin-Csrf': csrfToken || '',
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

  create: async (subjectData, csrfToken) => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects`, {
      method: 'POST',
      headers: getAdminHeaders(csrfToken),
      credentials: 'include',
      body: JSON.stringify(subjectData),
    });
    return handleResponse(response);
  },

  update: async (subjectId, subjectData, csrfToken) => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects/${subjectId}`, {
      method: 'PUT',
      headers: getAdminHeaders(csrfToken),
      credentials: 'include',
      body: JSON.stringify(subjectData),
    });
    return handleResponse(response);
  },

  delete: async (subjectId, csrfToken) => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Csrf': csrfToken || '',
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  importPreview: async ({ semester, file, deactivateMissing }, csrfToken) => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects/import/preview`, {
      method: 'POST',
      headers: {
        'X-Admin-Csrf': csrfToken || '',
      },
      credentials: 'include',
      body: createSubjectImportFormData(semester, file, deactivateMissing),
    });
    return handleResponse(response);
  },

  importApply: async ({ semester, file, deactivateMissing }, csrfToken) => {
    const response = await fetch(`${ADMIN_BASE_URL}/subjects/import/apply`, {
      method: 'POST',
      headers: {
        'X-Admin-Csrf': csrfToken || '',
      },
      credentials: 'include',
      body: createSubjectImportFormData(semester, file, deactivateMissing),
    });
    return handleResponse(response);
  },
};

export const adminAuthAPI = {
  login: async ({ username, password }) => {
    const response = await fetch(`${ADMIN_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
    const response = await fetch(`${ADMIN_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },
};
