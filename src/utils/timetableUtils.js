export const CURRENT_SEMESTER = '2026-1';

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

const subjectTypeAliases = {
    '전공핵심': '전핵',
    '전공심화': '전심',
    '전공기초': '전기',
    '핵심교양': '핵교',
    '심화교양': '심교',
    '기초교양': '기교',
    '일반선택': '일선',
};

const subjectTypeColors = {
    '전핵': { color: 'bg-blue-200', bg: 'bg-blue-100', textColor: 'text-blue-800', text: 'text-blue-800', borderColor: 'border-blue-400', border: 'border-blue-400' },
    '전심': { color: 'bg-purple-200', bg: 'bg-purple-100', textColor: 'text-purple-800', text: 'text-purple-800', borderColor: 'border-purple-400', border: 'border-purple-400' },
    '전기': { color: 'bg-indigo-200', bg: 'bg-indigo-100', textColor: 'text-indigo-800', text: 'text-indigo-800', borderColor: 'border-indigo-400', border: 'border-indigo-400' },
    '핵교': { color: 'bg-sky-200', bg: 'bg-sky-100', textColor: 'text-sky-800', text: 'text-sky-800', borderColor: 'border-sky-400', border: 'border-sky-400' },
    '심교': { color: 'bg-cyan-200', bg: 'bg-cyan-100', textColor: 'text-cyan-800', text: 'text-cyan-800', borderColor: 'border-cyan-400', border: 'border-cyan-400' },
    '기교': { color: 'bg-emerald-200', bg: 'bg-emerald-100', textColor: 'text-emerald-800', text: 'text-emerald-800', borderColor: 'border-emerald-400', border: 'border-emerald-400' },
    '일선': { color: 'bg-amber-200', bg: 'bg-amber-100', textColor: 'text-amber-800', text: 'text-amber-800', borderColor: 'border-amber-400', border: 'border-amber-400' },
    '교직': { color: 'bg-rose-200', bg: 'bg-rose-100', textColor: 'text-rose-800', text: 'text-rose-800', borderColor: 'border-rose-400', border: 'border-rose-400' },
    '군사학': { color: 'bg-slate-200', bg: 'bg-slate-100', textColor: 'text-slate-800', text: 'text-slate-800', borderColor: 'border-slate-400', border: 'border-slate-400' },
};

export const normalizeSubjectType = (subjectType) => {
    const type = typeof subjectType === 'string' ? subjectType.trim() : '';
    return subjectTypeAliases[type] || type;
};

export const getCourseTypeColorScheme = (subjectType) => {
    const normalizedType = normalizeSubjectType(subjectType);
    return subjectTypeColors[normalizedType] || {
        color: 'bg-slate-200',
        bg: 'bg-slate-100',
        textColor: 'text-slate-800',
        text: 'text-slate-800',
        borderColor: 'border-slate-400',
        border: 'border-slate-400',
    };
};

export const getCourseTypeBadgeClass = (subjectType) => {
    const { color, textColor } = getCourseTypeColorScheme(subjectType);
    return `${color} ${textColor}`;
};

export const formatCourse = (subject) => {
    const type = subject.subjectType || subject.type;
    const colorScheme = getCourseTypeColorScheme(type);
    const timeString = subject.schedules && Array.isArray(subject.schedules) ?
        subject.schedules.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(', ') :
        subject.time || '';

    return {
        id: subject.id,
        name: subject.subjectName || subject.name,
        credits: subject.credits,
        professor: subject.professor,
        department: subject.department,
        type,
        time: timeString,
        schedules: subject.schedules,
        classMethod: subject.classMethod,
        timetableAddCount:
            subject.timetableAddCount ??
            subject.timetable_add_count ??
            subject.addCount ??
            subject.add_count ??
            subject.timetableCount ??
            subject.timetable_count ??
            null,
        wishlistCount:
            subject.timetableAddCount ??
            subject.timetable_add_count ??
            subject.addCount ??
            subject.add_count ??
            subject.timetableCount ??
            subject.timetable_count ??
            subject.wishlistCount ??
            subject.wishlist_count ??
            subject.savedCount ??
            subject.saved_count ??
            subject.wishCount ??
            subject.wish_count ??
            subject.wishlistItemCount ??
            null,
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

const departmentGroupDefinitions = [
    {
        label: '인문대학',
        departments: ['국어국문학과', '영어영문학과', '독어독문학과', '불어불문학과', '일본지역문화학과', '중어중국학과']
    },
    {
        label: '자연과학대학',
        departments: ['수학과', '물리학과', '화학과', '패션산업학과', '해양학과']
    },
    {
        label: '사회과학대학',
        departments: ['사회복지학과', '미디어커뮤니케이션학과', '문헌정보학과', '창의인재개발학과', '소비자학과']
    },
    {
        label: '글로벌정경대학',
        departments: ['행정학과', '정치외교학과', '경제학과', '무역학부', '무역학부(야)', 'Global', 'Trade', '&Service']
    },
    {
        label: '공과대학',
        departments: ['기계공학과', '전기공학과', '전자공학과', '전자공학부', '전자공학전공', '전자(야)', '산업경영공학과', '산경(야)', '신소재공학과', '안전공학과', '에너지화학공학과', '바이오-로봇시스템공학과']
    },
    {
        label: '정보기술대학',
        departments: ['컴퓨터공학부', '정보통신공학과', '임베디드시스템공학과', '데이터과학과']
    },
    {
        label: '경영대학',
        departments: ['경영학부', '세무회계학과']
    },
    {
        label: '예술체육대학',
        departments: ['조형예술학부', '한국화전공', '서양화전공', '디자인학부', '공연예술학과', '스포츠과학부', '운동건강학부']
    },
    {
        label: '사범대학',
        departments: ['국어교육과', '영어교육과', '일어교육과', '수학교육과', '체육교육과', '유아교육과', '역사교육과', '윤리교육과']
    },
    {
        label: '도시과학대학',
        departments: ['도시행정학과', '도시공학과', '도시건축학부', '도시건축학전공', '건축공학전공', '도시환경공학부', '환경공학전공', '건설환경공학전공', '환경']
    },
    {
        label: '생명과학기술대학',
        departments: ['생명과학부', '생명과학전공', '생명공학부', '생명공학전공', '분자의생명전공', '나노바이오공학전공']
    },
    {
        label: '융합자유전공대학',
        departments: ['자유전공학부']
    },
    {
        label: '단과대구분없음',
        departments: ['HUSS(타대학)', 'HUSS포용사회이니셔티브학부', 'IBE전공', '동북아국제통상전공', '스마트물류공학전공', '물류학전공(연계)', '광전자공학전공(연계)', '미래교육디자인연계전공', '미래자동차연계전공', '소셜데이터사이언스연계전공', '인문문화예술기획연계전공', '창의적디자인연계전공', '반도체융합전공', '국제개발협력연계전공']
    },
    {
        label: '단과대구분없음(법학)',
        departments: ['법학부']
    }
];

const nonDepartmentFilterValues = new Set(['교양', '심화교양', '교직', '일선', '군사학']);
const knownDepartmentSet = new Set(departments);

const createDepartmentGroup = ({ label, departments: groupDepartments }) => ({
    id: `group:${label}`,
    label,
    departments: groupDepartments.filter(department => knownDepartmentSet.has(department))
});

const curatedDepartmentGroups = departmentGroupDefinitions
    .map(createDepartmentGroup)
    .filter(group => group.departments.length > 0);

const groupedDepartmentSet = new Set(curatedDepartmentGroups.flatMap(group => group.departments));
const ungroupedDepartments = departments
    .filter(department => (
        department !== '전체'
        && !nonDepartmentFilterValues.has(department)
        && !groupedDepartmentSet.has(department)
    ));

export const departmentGroups = [
    ...curatedDepartmentGroups,
    ...(ungroupedDepartments.length > 0
        ? [{ id: 'group:기타', label: '기타', departments: ungroupedDepartments }]
        : [])
];

export const getDepartmentFilterSelection = (value) => {
    if (!value || value === '전체') {
        return {
            type: 'all',
            label: '학과',
            departments: []
        };
    }

    const group = departmentGroups.find(candidate => candidate.id === value);
    if (group) {
        return {
            type: 'group',
            label: `${group.label} 전체`,
            group,
            departments: group.departments
        };
    }

    return {
        type: 'department',
        label: value,
        department: value,
        departments: [value]
    };
};

export const getDepartmentFilterParams = (value) => {
    const selection = getDepartmentFilterSelection(value);

    if (selection.type === 'all') {
        return {};
    }

    if (selection.type === 'group') {
        return { departments: selection.departments };
    }

    return { department: selection.department };
};

export const courseTypes = ['전체', '전핵', '전심', '전기', '심교', '핵교', '기교', '일선'];

export const grades = ['전체', '1학년', '2학년', '3학년', '4학년'];

export const UNASSIGNED_TIME_FILTER = '온라인';

export const filterDaysOfWeek = ['전체', '월', '화', '수', '목', '금', '토', UNASSIGNED_TIME_FILTER];

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

export const creditOptions = ['전체', '1학점', '2학점', '3학점'];
