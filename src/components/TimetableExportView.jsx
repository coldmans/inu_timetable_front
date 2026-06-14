import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { parseTime, parseTimeString, daysOfWeek, timeSlots, displayTimeSlots } from '../utils/timetableUtils';

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

  const unscheduledCourses = [];

  courses.forEach(course => {
    const times = course.schedules ? parseTime(course.schedules) : parseTimeString(course.time);

    if (times.length === 0) {
      unscheduledCourses.push(course);
      return;
    }

    let mapped = false;
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

      mapped = true;
      let isFirstSlot = true;
      for (let i = startIndex; i < endIndex; i += 1) {
        const slotKey = timeSlots[i];
        if (slotKey && grid[day][slotKey] === null) {
          grid[day][slotKey] = {
            ...course,
            isStart: isFirstSlot,
            span: totalSlots,
          };
          isFirstSlot = false;
        }
      }
    });

    if (!mapped) {
      unscheduledCourses.push(course);
    }
  });

  return { grid, unscheduledCourses };
};

const ExportTimeSlotCell = ({ day, slot, index, grid }) => {
  const course = grid[day]?.[slot];
  const isFirstHalf = slot.endsWith('-1');
  const emptyClass = `border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-50' : 'bg-white'}`;

  if (course) {
    if (!course.isStart) {
      return null;
    }

    const isCompact = (course.span || 0) <= 2;
    return (
      <td rowSpan={course.span || 1} className="relative border border-slate-200 bg-white p-0">
        <div data-export-course-block className={`absolute inset-[5px] flex flex-col justify-center overflow-hidden rounded-xl px-3 py-2 shadow-sm ring-1 ring-white/70 ${course.color || 'bg-blue-100'} ${course.textColor || 'text-slate-900'}`}>
          <div
            data-export-course-name
            className={`${isCompact ? 'text-[23px]' : 'text-[27px]'} font-extrabold leading-[1.05] tracking-normal`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: isCompact ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {course.name}
          </div>
          <div data-export-course-meta className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${isCompact ? 'text-[15px]' : 'text-[17px]'} font-semibold leading-tight opacity-85`}>
            {course.professor && <span>{course.professor}</span>}
            {course.credits && <span>{course.credits}학점</span>}
          </div>
          {!isCompact && course.department && (
            <div className="mt-0.5 truncate text-[13px] font-medium leading-tight opacity-70">
              {course.department}
            </div>
          )}
        </div>
      </td>
    );
  }

  if (isFirstHalf) {
    const nextSlot = timeSlots[index + 1];
    const nextCourse = grid[day]?.[nextSlot];

    if (nextCourse && nextCourse.isStart) {
      return <td rowSpan={1} className={emptyClass}></td>;
    }

    return <td rowSpan={2} className={emptyClass}></td>;
  }

  const prevSlot = timeSlots[index - 1];
  const prevCourse = grid[day]?.[prevSlot];
  return prevCourse ? <td rowSpan={1} className={emptyClass}></td> : null;
};

const TimetableExportView = React.forwardRef(({ courses, semester }, ref) => {
  const { grid, unscheduledCourses } = useMemo(() => buildTimetableGrid(courses), [courses]);
  const totalCredits = courses.reduce((total, course) => total + (course.credits || 0), 0);
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div ref={ref} data-export-timetable className="w-[1600px] bg-white p-12 text-slate-900">
      <div className="mb-8 flex items-end justify-between border-b-2 border-slate-900 pb-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[18px] font-bold text-white">
            <CalendarDays size={22} />
            INU 시간표
          </div>
          <h1 className="text-[46px] font-extrabold tracking-normal text-slate-950">
            {semester} 시간표
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-extrabold text-slate-900">{totalCredits}학점</div>
          <div className="mt-1 text-[15px] font-medium text-slate-500">{today} 저장</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-200">
        <table className="w-full table-fixed border-collapse text-slate-700">
          <colgroup>
            <col style={{ width: '86px' }} />
            {daysOfWeek.map(day => (
              <col key={day} style={{ width: `calc((100% - 86px) / ${daysOfWeek.length})` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-100 p-3"></th>
              {daysOfWeek.map(day => (
                <th key={day} className="border border-slate-200 bg-slate-100 py-4 text-center text-[22px] font-extrabold text-slate-700">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, index) => (
              <tr key={slot} style={{ height: '42px' }}>
                {slot.endsWith('-1') && (
                  <td
                    rowSpan={2}
                    className={`border border-slate-200 text-center text-[18px] font-extrabold tabular-nums ${slot.startsWith('야') ? 'bg-slate-100 text-blue-600' : 'bg-slate-50 text-slate-500'}`}
                  >
                    {displayTimeSlots[Math.floor(index / 2)]}
                  </td>
                )}
                {daysOfWeek.map(day => (
                  <ExportTimeSlotCell
                    key={`${day}-${slot}`}
                    day={day}
                    slot={slot}
                    index={index}
                    grid={grid}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unscheduledCourses.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-[22px] font-extrabold text-slate-900">온라인 · 시간 미지정</h2>
          <div className="grid grid-cols-2 gap-3">
            {unscheduledCourses.map((course, index) => (
              <div
                key={course.id || index}
                className={`rounded-xl px-4 py-3 ring-1 ring-white/70 ${course.color || 'bg-slate-100'} ${course.textColor || 'text-slate-800'}`}
              >
                <div className="truncate text-[20px] font-extrabold leading-tight">{course.name}</div>
                <div className="mt-1 text-[14px] font-semibold opacity-80">
                  {[course.professor, course.credits ? `${course.credits}학점` : null, course.department]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TimetableExportView.displayName = 'TimetableExportView';

export default TimetableExportView;
