export const CURRENT_SEMESTER = '2024-2';

export const convertToPeriod = (timeValue) => {
    const PERIOD_START_HOUR_OFFSET = 8;
    const REAL_TIME_THRESHOLD = 13;
    let period = parseFloat(timeValue);

    if (typeof timeValue === 'string' && timeValue.includes(':')) {
        const [hour, minute] = timeValue.split(':').map(parseFloat);
        period = hour + (minute / 60) - PERIOD_START_HOUR_OFFSET;
    }

    if (period >= REAL_TIME_THRESHOLD) {
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
    if (!timeString) return [];
    return timeString.split(',').map(part => {
        const trimmed = part.trim();
        const day = trimmed[0];
        const timePart = trimmed.substring(2);

        let start, end;

        if (timePart.includes(':')) {
            const periods = timePart.split('-').map(t => convertToPeriod(t));
            start = periods[0];
            end = periods[periods.length - 1];
        } else {
            const hours = timePart.split('-').map(Number);
            start = hours[0];
            end = hours[hours.length - 1];
        }

        return { day, start, end };
    });
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
    '(핵심)사회',
    '(핵심)외국어',
    '(핵심)인문',
    'IBE전공',
    '건설환경공학전공',
    '건축공학전공',
    '경영학부',
    '경제학과',
    '공연예술학과',
    '광전자공학전공(연계)',
    '과학기술',
    '교직',
    '국어교육과',
    '국어국문학과',
    '군사학',
    '기계공학과',
    '기초과학ㆍ공학',
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
    '문헌정보학과',
    '물리학과',
    '미디어커뮤니케이션학과',
    '물류학전공(연계)',
    '바이오-로봇시스템공학과',
    '반도체융합전공',
    '법학부',
    '분자의생명전공',
    '불어불문학과',
    '사회',
    '사회복지학과',
    '산업경영공학과',
    '생명공학부',
    '생명공학전공',
    '생명과학부',
    '생명과학전공',
    '서양화전공',
    '세무회계학과',
    '소비자학과',
    '수학과',
    '수학교육과',
    '스마트물류공학전공',
    '스포츠과학부',
    '신소재공학과',
    '안전공학과',
    '에너지화학공학과',
    '역사교육과',
    '영어교육과',
    '영어영문학과',
    '예술체육',
    '외국어',
    '운동건강학부',
    '유아교육과',
    '윤리교육과',
    '인문',
    '일본지역문화학과',
    '일선',
    '일어교육과',
    '임베디드시스템공학과',
    '자유전공학부',
    '전기공학과',
    '전자공학과',
    '전자공학부',
    '전자공학전공',
    '정보통신공학과',
    '정치외교학과',
    '조형예술학부',
    '중어중국학과',
    '창의인재개발학과',
    '체육교육과',
    '컴퓨터공학부',
    '패션산업학과',
    '한국화전공',
    '해양학과',
    '핵심과학기술',
    '핵심교양',
    '행정학과',
    '화학과',
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
