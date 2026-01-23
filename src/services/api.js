const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// API 응답 처리 헬퍼
const handleResponse = async (response) => {
  console.log(`API 응답: ${response.status} ${response.statusText} - ${response.url}`);

  if (!response.ok) {
    let errorMessage = '서버 오류가 발생했습니다.';
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
      console.error('API 에러 상세:', error);
    } catch (e) {
      console.error('에러 응답 파싱 실패:', e);
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// 인증 API
export const authAPI = {
  // 회원가입
  register: async (userData) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // 로그인
  login: async (credentials) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },
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

// 위시리스트 API
export const wishlistAPI = {
  // 위시리스트에 과목 추가 (필수 과목 지정 포함)
  add: async (data) => {
    const response = await fetch(`${BASE_URL}/wishlist/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 위시리스트 조회
  getByUser: async (userId, semester = '2024-2') => {
    const response = await fetch(`${BASE_URL}/wishlist/user/${userId}?semester=${semester}`);
    return handleResponse(response);
  },

  // 위시리스트에서 제거
  remove: async (userId, subjectId) => {
    const response = await fetch(`${BASE_URL}/wishlist/remove?userId=${userId}&subjectId=${subjectId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // 우선순위 변경
  updatePriority: async (data) => {
    const response = await fetch(`${BASE_URL}/wishlist/priority`, {
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
    const response = await fetch(`${BASE_URL}/wishlist/required`, {
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
    const response = await fetch(`${BASE_URL}/timetable/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 개인 시간표 조회
  getByUser: async (userId, semester = '2024-2') => {
    const response = await fetch(`${BASE_URL}/timetable/user/${userId}?semester=${semester}`);
    return handleResponse(response);
  },

  // 시간표에서 과목 제거
  remove: async (userId, subjectId) => {
    const response = await fetch(`${BASE_URL}/timetable/remove?userId=${userId}&subjectId=${subjectId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // 메모 수정
  updateMemo: async (data) => {
    const response = await fetch(`${BASE_URL}/timetable/memo`, {
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
    const response = await fetch(`${BASE_URL}/timetable-combination/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};
<<<<<<< Updated upstream
=======

// 과목 통계 API
export const statisticsAPI = {
  // 과목별 참여자 통계 조회
  getSubjectStats: async (subjectId, semester = '2024-2') => {
    if (!subjectId) {
      throw new Error('과목 ID가 필요합니다.');
    }

    const response = await fetch(`${BASE_URL}/subjects/${subjectId}/statistics?semester=${semester}`);
    return handleResponse(response);
  },
};


>>>>>>> Stashed changes
