const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const DEFAULT_SEMESTER = '2026-1';

// API 응답 처리 헬퍼
export const handleResponse = async (response) => {
  console.log(`API 응답: ${response.status} ${response.statusText} - ${response.url}`);

  const responseText = await response.text();
  const parseBody = () => {
    if (!responseText) return null;
    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  };

  if (!response.ok) {
    let errorMessage = '서버 오류가 발생했습니다.';
    const errorBody = parseBody();

    if (errorBody && typeof errorBody === 'object') {
      errorMessage = errorBody.error || errorBody.message || errorMessage;
      console.error('API 에러 상세:', errorBody);
    } else if (typeof errorBody === 'string' && errorBody.trim()) {
      errorMessage = errorBody;
      console.error('API 에러 상세:', errorBody);
    }

    const apiError = new Error(errorMessage);
    apiError.status = response.status;
    apiError.payload = errorBody;
    throw apiError;
  }

  return parseBody();
};

const readCookie = (name) => {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(encodedName));
  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : '';
};

const clearCookie = (name) => {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/`;
};

const fetchWithUserSession = (url, options = {}) => fetch(url, {
  ...options,
  credentials: 'include',
});

let csrfTokenPromise = null;

const resetUserCsrfToken = () => {
  csrfTokenPromise = null;
  clearCookie('XSRF-TOKEN');
};

const getUserCsrfToken = async () => {
  const cookieToken = readCookie('XSRF-TOKEN');
  if (cookieToken) {
    return cookieToken;
  }

  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const response = await fetchWithUserSession(`${BASE_URL}/auth/csrf`);
      const payload = await handleResponse(response);
      return payload?.token || readCookie('XSRF-TOKEN');
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
};

const fetchWithUserCsrf = async (url, options = {}) => {
  const csrfToken = await getUserCsrfToken();
  const requestOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      'X-XSRF-TOKEN': csrfToken,
    },
  };

  const response = await fetchWithUserSession(url, requestOptions);
  if (response.status !== 403) {
    return response;
  }

  resetUserCsrfToken();
  const refreshedToken = await getUserCsrfToken();
  return fetchWithUserSession(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'X-XSRF-TOKEN': refreshedToken,
    },
  });
};

const handleUserSessionMutationResponse = async (response) => {
  try {
    const payload = await handleResponse(response);
    resetUserCsrfToken();
    return payload;
  } catch (error) {
    resetUserCsrfToken();
    throw error;
  }
};

// 과목 조회 API
export const subjectAPI = {
  // 전체 과목 조회 (페이징)
  getAll: async (page = 0, size = 20) => {
    const response = await fetch(`${BASE_URL}/subjects?page=${page}&size=${size}`);
    return handleResponse(response);
  },

  // 과목 필터링 (페이징 지원)
  filter: async (filters, page = 0, size = 20) => {
    const params = new URLSearchParams();

    // 페이징 파라미터 추가
    params.append('page', page.toString());
    params.append('size', size.toString());

    // 필터 파라미터 추가
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value
          .filter(item => item !== undefined && item !== '' && item !== '전체')
          .forEach(item => params.append(key, item));
        return;
      }

      if (value !== undefined && value !== '' && value !== '전체') {
        params.append(key, value);
      }
    });

    const finalURL = `${BASE_URL}/subjects/filter?${params}`;
    console.log(`API 요청: ${finalURL}`);
    console.log(`📄 페이지: ${page}, 크기: ${size}`);

    const response = await fetch(finalURL);
    return handleResponse(response);
  },

  // 과목 개수 조회
  getCount: async () => {
    const response = await fetch(`${BASE_URL}/subjects/count`);
    return handleResponse(response);
  },
};

// 인증 API
export const authAPI = {
  // 회원가입
  register: async (userData) => {
    const response = await fetchWithUserSession(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleUserSessionMutationResponse(response);
  },

  // 로그인
  login: async (credentials) => {
    const response = await fetchWithUserSession(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return handleUserSessionMutationResponse(response);
  },

  createDevSession: async ({ semester, seedWishlist = true, reset = false } = {}) => {
    const response = await fetchWithUserSession(`${BASE_URL}/dev/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ semester, seedWishlist, reset }),
    });
    return handleUserSessionMutationResponse(response);
  },

  me: async () => {
    const response = await fetchWithUserSession(`${BASE_URL}/auth/me`);
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/auth/logout`, {
      method: 'POST',
    });
    return handleUserSessionMutationResponse(response);
  },

  withdraw: async () => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/auth/me`, {
      method: 'DELETE',
    });
    return handleUserSessionMutationResponse(response);
  },
};

// 위시리스트 API
export const wishlistAPI = {
  // 위시리스트에 과목 추가 (필수 과목 지정 포함)
  add: async (data) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/wishlist/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 위시리스트 조회
  getByUser: async (userId, semester = DEFAULT_SEMESTER) => {
    const response = await fetchWithUserSession(`${BASE_URL}/wishlist/user/${userId}?semester=${semester}`);
    return handleResponse(response);
  },

  // 위시리스트에서 제거
  remove: async (userId, subjectId) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/wishlist/remove?userId=${userId}&subjectId=${subjectId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // 우선순위 변경
  updatePriority: async (data) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/wishlist/priority`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 필수 과목 설정 변경
  updateRequired: async (data) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/wishlist/required`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// 개인 시간표 API
export const timetableAPI = {
  // 시간표에 과목 추가
  add: async (data) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/timetable/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 개인 시간표 조회
  getByUser: async (userId, semester = DEFAULT_SEMESTER) => {
    const response = await fetchWithUserSession(`${BASE_URL}/timetable/user/${userId}?semester=${semester}`);
    return handleResponse(response);
  },

  // 시간표에서 과목 제거
  remove: async (userId, subjectId) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/timetable/remove?userId=${userId}&subjectId=${subjectId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // 메모 수정
  updateMemo: async (data) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/timetable/memo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// 시간표 자동 조합 API
export const combinationAPI = {
  // 시간표 자동 조합 생성
  generate: async (data) => {
    const response = await fetchWithUserCsrf(`${BASE_URL}/timetable-combination/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// 과목 통계 API
export const statisticsAPI = {
  // 과목별 참여자 통계 조회
  getSubjectStats: async (subjectId, semester = DEFAULT_SEMESTER) => {
    if (!subjectId) {
      throw new Error('과목 ID가 필요합니다.');
    }

    const response = await fetch(`${BASE_URL}/subjects/${subjectId}/statistics?semester=${semester}`);
    return handleResponse(response);
  },
};

// 설문조사 API
export const surveyAPI = {
  // 설문 응답 제출
  submit: async (surveyData) => {
    const response = await fetch(`${BASE_URL}/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(surveyData),
    });
    return handleResponse(response);
  },
};
