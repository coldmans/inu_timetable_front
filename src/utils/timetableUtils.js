export const CURRENT_SEMESTER = '2024-2';

export const convertToPeriod = (timeValue) => {
    const PERIOD_START_HOUR_OFFSET = 8;

    if (!timeValue) return 0;

    let period;
    let isRealTime = false;

    if (typeof timeValue === 'string') {
        const cleaned = timeValue.trim();

        // Handle Night prefix (야1, 야2, ...)
        if (cleaned.startsWith('야')) {
            const numPart = cleaned.replace(/[^0-9.]/g, '');
            const num = parseFloat(numPart);
            return isNaN(num) ? 0 : num + 9;
        }

        // Handle colons (18:00, 21:00, ...)
        if (cleaned.includes(':')) {
            const [hour, minute] = cleaned.split(':').map(parseFloat);
            period = hour + (minute / 60) - PERIOD_START_HOUR_OFFSET;
            isRealTime = true;
        } else {
            // Handle bracket system and suffixes (2A, 5B, 10교시, ...)
            const cleanedNum = cleaned.replace(/[A-Za-zㄱ-ㅎ가-힣]/g, (match) => {
                if (match.toUpperCase() === 'A') return '';
                if (match.toUpperCase() === 'B') return '.5';
                return '';
            });
            period = parseFloat(cleanedNum);
        }
    } else {
        period = parseFloat(timeValue);
    }

    // Only subtract offset if it's a large raw number (representing an hour like 15)
    // Avoid subtracting from period numbers (1-13)
    if (!isRealTime && period >= 14) {
        period -= PERIOD_START_HOUR_OFFSET;
    }

    if (isNaN(period)) return 0;

    return Math.round(period * 2) / 2;
};

export const parseTime = (schedules) => {
    if (!schedules || !Array.isArray(schedules)) return [];

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
        const startPeriod = convertToPeriod(schedule.startTime);
        const endPeriod = convertToPeriod(schedule.endTime);

        const dayKey = schedule.dayOfWeek ? schedule.dayOfWeek.toUpperCase() : schedule.dayOfWeek;
        const day = dayMapping[dayKey] || schedule.dayOfWeek;

        return {
            day: day,
            start: startPeriod,
            end: endPeriod,
        };
    });
};

export const parseTimeString = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return [];

    // Remove location info like (07-504)
    const cleanedString = timeString.replace(/\([^)]+\)/g, '').trim();
    if (!cleanedString || cleanedString.includes('온라인')) return [];

    const results = [];
    const dayRegex = /([월화수목금토일])\s*([^월화수목금토일]+)/g;
    let match;

    while ((match = dayRegex.exec(cleanedString)) !== null) {
        const day = match[1];
        const timePart = match[2].trim();

        // Split by various separators including comma, space, dash, tilde, slash
        const parts = timePart.split(/[\s,~,/-]+/).filter(Boolean);

        if (parts.length > 0) {
            const periods = parts.map(n => convertToPeriod(n));
            const start = Math.min(...periods);
            let end = Math.max(...periods);

            const isRange = timePart.includes('-') || timePart.includes('~') || timePart.includes('/');
            const isPeriodBased = !timePart.includes(':');

            if (isPeriodBased) {
                // If it's a period (1-3 or 10,11,12), the duration includes the last period
                end = end + 1;
            }

            results.push({ day, start, end });
        }
    }

    return results;
};

export const formatCourse = (subject, index = 0) => {
    const colors = [
        { color: 'bg-blue-200', textColor: 'text-blue-800', borderColor: 'border-blue-400' },
        { color: 'bg-green-200', textColor: 'text-green-800', borderColor: 'border-green-400' },
        { color: 'bg-indigo-200', textColor: 'text-indigo-800', borderColor: 'border-indigo-400' },
        { color: 'bg-yellow-200', textColor: 'text-yellow-800', borderColor: 'border-yellow-400' },
        { color: 'bg-purple-200', textColor: 'text-purple-800', borderColor: 'border-purple-400' },
        { color: 'bg-pink-200', textColor: 'text-pink-800', borderColor: 'border-pink-400' },
        { color: 'bg-teal-200', textColor: 'text-teal-800', borderColor: 'border-teal-400' },
        { color: 'bg-sky-200', textColor: 'text-sky-800', borderColor: 'border-sky-400' },
        { color: 'bg-red-200', textColor: 'text-red-800', borderColor: 'border-red-400' },
        { color: 'bg-orange-200', textColor: 'text-orange-800', borderColor: 'border-orange-400' },
    ];

    const colorScheme = colors[index % colors.length];
    const timeString = subject.schedules && Array.isArray(subject.schedules) ?
        subject.schedules.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(', ') :
        subject.time || '';

    return {
        id: subject.id,
        name: subject.subjectName || subject.name,
        credits: subject.credits,
        professor: subject.professor,
        department: subject.department,
        type: subject.subjectType || subject.type,
        time: timeString,
        schedules: subject.schedules,
        rating: subject.rating || 4.0,
        reviews: subject.reviews || 0,
        ...colorScheme
    };
};

export const departments = [
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

export const courseTypes = ['전체', '전핵', '전심', '전기', '심교', '핵교', '기교', '일선'];

export const grades = ['전체', '1학년', '2학년', '3학년', '4학년'];

export const filterDaysOfWeek = ['전체', '월', '화', '수', '목', '금', '토'];

export const timeOptions = ['전체', 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12];

// 두 과목 간 시간 충돌을 확인하는 함수
export const checkConflict = (courseA, courseB) => {
    const timesA = courseA.schedules ? parseTime(courseA.schedules) : parseTimeString(courseA.time);
    const timesB = courseB.schedules ? parseTime(courseB.schedules) : parseTimeString(courseB.time);

    for (const timeA of timesA) {
        for (const timeB of timesB) {
            if (timeA.day === timeB.day && timeA.start < timeB.end && timeA.end > timeB.start) {
                return true; // 충돌 발생
            }
        }
    }
    return false; // 충돌 없음
};

export const daysOfWeek = ['월', '화', '수', '목', '금', '토'];

export const timeSlots = [
    '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '5-1', '5-2',
    '6-1', '6-2', '7-1', '7-2', '8-1', '8-2', '9-1', '9-2',
    '야1-1', '야1-2', '야2-1', '야2-2', '야3-1', '야3-2', '야4-1', '야4-2'
];

export const displayTimeSlots = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, '야1', '야2', '야3', '야4'
];
