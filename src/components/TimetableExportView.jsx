import React, { useMemo } from 'react';
import { parseTime, parseTimeString, daysOfWeek, timeSlots } from '../utils/timetableUtils';

const EXPORT_WIDTH = 760;
const EXPORT_HORIZONTAL_PADDING = 16;
const EXPORT_TABLE_BORDER_WIDTH = 2;
const TIME_LABEL_COLUMN_WIDTH = 40;
const WEEKDAY_EXPORT_DAYS = ['월', '화', '수', '목', '금'];
const EXPORT_TIME_LABELS = ['9', '10', '11', '12', '1', '2', '3', '4', '5', '야1', '야2', '야3', '야4'];
const COURSE_COLOR_SCHEMES = [
  { backgroundColor: '#dbeafe', color: '#1e3a8a', borderColor: '#bfdbfe' },
  { backgroundColor: '#e0f2fe', color: '#075985', borderColor: '#bae6fd' },
  { backgroundColor: '#ede9fe', color: '#5b21b6', borderColor: '#ddd6fe' },
  { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' },
  { backgroundColor: '#fce7f3', color: '#9d174d', borderColor: '#fbcfe8' },
  { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' },
  { backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#c7d2fe' },
  { backgroundColor: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4' },
  { backgroundColor: '#ffedd5', color: '#9a3412', borderColor: '#fed7aa' },
  { backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' },
];

const getStableHash = (value) => {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getCourseColorScheme = (course) => {
  if (course.exportColorScheme) {
    return course.exportColorScheme;
  }

  const key = course.id || `${course.name}-${course.professor}`;
  return COURSE_COLOR_SCHEMES[getStableHash(key) % COURSE_COLOR_SCHEMES.length];
};

const getCourseTimes = (course) => (
  course.schedules ? parseTime(course.schedules) : parseTimeString(course.time)
);

const formatCourseDays = (course) => {
  const times = getCourseTimes(course);
  if (times.length === 0) {
    return course.classMethod === 'ONLINE' || String(course.time || '').includes('온라인')
      ? '온라인'
      : '시간 미지정';
  }

  const uniqueDays = [...new Set(times.map(time => time.day).filter(Boolean))];
  return uniqueDays.join(' · ');
};

const getCourseListMeta = (course) => [
  course.professor,
  course.department,
  course.credits ? `${course.credits}학점` : null,
].filter(Boolean).join(' · ');

const hasNightCourse = (courses) => courses.some(course => (
  getCourseTimes(course).some(({ start, end }) => start >= 10 || end > 10)
));

const buildTimetableGrid = (courses) => {
  const grid = {};
  daysOfWeek.forEach(day => {
    grid[day] = {};
    timeSlots.forEach(slot => {
      grid[day][slot] = null;
    });
  });

  const getSlotIndex = (period) => {
    if (Number.isNaN(period) || period < 1) return -1;
    return Math.round((period - 1) * 2);
  };

  courses.forEach((course, courseIndex) => {
    const exportColorScheme = COURSE_COLOR_SCHEMES[courseIndex % COURSE_COLOR_SCHEMES.length];
    const times = getCourseTimes(course);

    if (times.length === 0) {
      return;
    }

    times.forEach(({ day, start, end }) => {
      if (!grid[day]) {
        return;
      }

      const startIndex = getSlotIndex(start);
      const endIndex = getSlotIndex(end);
      const totalSlots = endIndex - startIndex;

      if (totalSlots <= 0) {
        return;
      }

      let isFirstSlot = true;
      for (let i = startIndex; i < endIndex; i += 1) {
        const slotKey = timeSlots[i];
        if (slotKey && grid[day][slotKey] === null) {
          grid[day][slotKey] = {
            ...course,
            exportColorScheme,
            isStart: isFirstSlot,
            span: totalSlots,
          };
          isFirstSlot = false;
        }
      }
    });
  });

  return { grid };
};

const ExportSummaryPill = ({ label, value }) => (
  <div className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
    <div className="text-[10px] font-bold leading-none text-slate-400">{label}</div>
    <div className="mt-1 text-[16px] font-black leading-none text-slate-900">{value}</div>
  </div>
);

const ExportCourseList = ({ courses }) => {
  const visibleCourses = courses.slice(0, 8);
  const hiddenCount = Math.max(courses.length - visibleCourses.length, 0);

  return (
    <section className="mt-3 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <h2 className="text-[14px] font-black leading-none text-slate-800">담은 과목</h2>
        <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black leading-none text-white">
          {courses.length}개
        </span>
      </div>
      <div>
        {visibleCourses.map((course, index) => {
          const colorScheme = getCourseColorScheme(course);
          return (
            <div
              key={course.id || `${course.name}-${index}`}
              className="grid grid-cols-[18px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-2 last:border-b-0"
            >
              <span
                className="h-4 w-4 rounded-full border"
                style={{
                  backgroundColor: colorScheme.backgroundColor,
                  borderColor: colorScheme.borderColor,
                }}
              ></span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-black leading-tight text-slate-900">{course.name}</div>
                <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-slate-500">
                  {getCourseListMeta(course) || '과목 정보'}
                </div>
              </div>
              <span
                className="rounded-full border px-2.5 py-1 text-[10px] font-black leading-none"
                style={{
                  backgroundColor: colorScheme.backgroundColor,
                  borderColor: colorScheme.borderColor,
                  color: colorScheme.color,
                }}
              >
                {formatCourseDays(course)}
              </span>
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="bg-slate-50 px-4 py-2 text-center text-[11px] font-bold text-slate-500">
            외 {hiddenCount}개 과목
          </div>
        )}
      </div>
    </section>
  );
};

const ExportTimeSlotCell = ({ day, slot, index, grid, timeSlotList }) => {
  const course = grid[day]?.[slot];
  const isFirstHalf = slot.endsWith('-1');
  const emptyClass = `border border-slate-200 ${slot.startsWith('야') ? 'bg-blue-50/45' : 'bg-white'}`;

  if (course) {
    if (!course.isStart) {
      return null;
    }

    const isCompact = (course.span || 0) <= 2;
    const colorScheme = getCourseColorScheme(course);
    return (
      <td rowSpan={course.span || 1} className="relative border border-slate-200 bg-white p-0">
        <div
          data-export-course-block
          className="absolute inset-[2px] flex flex-col overflow-hidden rounded-[6px] border px-1.5 py-1"
          style={colorScheme}
        >
          <div
            data-export-course-name
            className={`${isCompact ? 'text-[15px]' : 'text-[17px]'} font-extrabold leading-[1.08] tracking-normal`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: isCompact ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {course.name}
          </div>
          <div data-export-course-meta className={`${isCompact ? 'mt-0.5 text-[10px]' : 'mt-1 text-[11px]'} font-semibold leading-tight opacity-95`}>
            {course.professor && <span>{course.professor}</span>}
            {course.professor && course.credits && <span> · </span>}
            {course.credits && <span>{course.credits}학점</span>}
          </div>
        </div>
      </td>
    );
  }

  if (isFirstHalf) {
    const nextSlot = timeSlotList[index + 1];
    const nextCourse = grid[day]?.[nextSlot];

    if (nextCourse && nextCourse.isStart) {
      return <td rowSpan={1} className={emptyClass}></td>;
    }

    return <td rowSpan={2} className={emptyClass}></td>;
  }

  const prevSlot = timeSlotList[index - 1];
  const prevCourse = grid[day]?.[prevSlot];
  return prevCourse ? <td rowSpan={1} className={emptyClass}></td> : null;
};

const TimetableExportView = React.forwardRef(({ courses, semester }, ref) => {
  const { grid } = useMemo(() => buildTimetableGrid(courses), [courses]);
  const totalCredits = courses.reduce((total, course) => total + (course.credits || 0), 0);
  const visibleDays = useMemo(() => {
    const hasSaturdayCourse = courses.some(course => getCourseTimes(course).some(time => time.day === '토'));

    return hasSaturdayCourse ? daysOfWeek : WEEKDAY_EXPORT_DAYS;
  }, [courses]);
  const visibleTimeSlots = useMemo(() => (
    hasNightCourse(courses) ? timeSlots : timeSlots.slice(0, 18)
  ), [courses]);
  const visibleTimeLabels = useMemo(() => (
    hasNightCourse(courses) ? EXPORT_TIME_LABELS : EXPORT_TIME_LABELS.slice(0, 9)
  ), [courses]);
  const dayColumnWidth = (
    EXPORT_WIDTH - (EXPORT_HORIZONTAL_PADDING * 2) - EXPORT_TABLE_BORDER_WIDTH - TIME_LABEL_COLUMN_WIDTH
  ) / visibleDays.length;
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div
      ref={ref}
      data-export-timetable
      className="bg-white p-4 text-slate-900"
      style={{ width: `${EXPORT_WIDTH}px` }}
    >
      <header className="mb-3 rounded-[24px] border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[20px] font-semibold leading-none text-slate-400">
              {semester}
            </div>
            <h1 className="mt-1.5 leading-none tracking-normal">
              <span className="text-[44px] font-black text-slate-950">시</span>
              <span className="text-[44px] font-extrabold text-slate-950">간</span>
              <span className="text-[44px] font-bold text-slate-950">표</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportSummaryPill label="학점" value={`${totalCredits}`} />
            <ExportSummaryPill label="과목" value={`${courses.length}`} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
          <div className="text-[12px] font-bold text-slate-500">
            {visibleDays.length === 6 ? '월-토 시간표' : '월-금 시간표'}
          </div>
          <div className="text-[12px] font-bold text-slate-400">{today}</div>
        </div>
      </header>

      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <table className="w-full table-fixed border-collapse text-slate-500">
          <colgroup>
            <col style={{ width: `${TIME_LABEL_COLUMN_WIDTH}px` }} />
            {visibleDays.map(day => (
              <col key={day} style={{ width: `${dayColumnWidth}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 p-2"></th>
              {visibleDays.map(day => (
                <th key={day} className="border border-slate-200 bg-slate-50 py-2 text-center text-[15px] font-extrabold text-slate-500">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTimeSlots.map((slot, index) => (
              <tr key={slot} style={{ height: '27px' }}>
                {slot.endsWith('-1') && (
                  <td
                    rowSpan={2}
                    className={`border border-slate-200 text-center text-[15px] font-bold tabular-nums ${slot.startsWith('야') ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}
                  >
                    {visibleTimeLabels[Math.floor(index / 2)]}
                  </td>
                )}
                {visibleDays.map(day => (
                  <ExportTimeSlotCell
                    key={`${day}-${slot}`}
                    day={day}
                    slot={slot}
                    index={index}
                    grid={grid}
                    timeSlotList={visibleTimeSlots}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ExportCourseList courses={courses} />

      <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span>INU 시간표</span>
        <span>inuu-timetable.vercel.app</span>
      </div>
    </div>
  );
});

TimetableExportView.displayName = 'TimetableExportView';

export default TimetableExportView;
