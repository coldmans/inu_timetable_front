import React, { useState, useMemo } from 'react';
import { Download, CalendarDays, Trash2 } from 'lucide-react';
import TimetableCourseMenu from './TimetableCourseMenu';
import { parseTime, parseTimeString, daysOfWeek, timeSlots, displayTimeSlots } from '../utils/timetableUtils';

const TimeSlotCell = ({ day, slot, index, grid, onCourseClick }) => {
    const course = grid[day]?.[slot];
    const isFirstHalf = slot.endsWith('-1');
    const emptyClass = `border border-slate-100 ${slot.startsWith('야') ? 'bg-slate-50' : 'bg-white'}`;

    // Case 1: Course exists
    if (course) {
        if (course.isStart) {
            const backgroundColor = course.color || 'bg-blue-100';
            const textColor = course.textColor || 'text-slate-900';
            return (
                <td
                    rowSpan={course.span || 1}
                    className="relative cursor-pointer border border-slate-100 bg-white p-0"
                    onClick={(e) => onCourseClick(e, course)}
                >
                    <div className={`absolute inset-[2px] flex flex-col overflow-hidden rounded-md px-1.5 py-1 transition-[filter] hover:brightness-95 ${backgroundColor} ${textColor}`}>
                        <div className="w-full break-words text-[11px] font-semibold leading-tight">{course.name}</div>
                        {course.professor && (
                            <div className="mt-0.5 w-full truncate text-[10px] leading-none opacity-75">{course.professor}</div>
                        )}
                    </div>
                </td>
            );
        }
        return null;
    }

    // Case 2: Empty cell
    if (isFirstHalf) {
        const nextSlotIndex = index + 1;
        const nextSlot = timeSlots[nextSlotIndex];
        const nextCourse = grid[day]?.[nextSlot];

        if (nextCourse && nextCourse.isStart) {
            return (
                <td rowSpan={1} className={emptyClass}></td>
            );
        }

        return (
            <td rowSpan={2} className={emptyClass}></td>
        );
    } else {
        const prevSlotIndex = index - 1;
        const prevSlot = timeSlots[prevSlotIndex];
        const prevCourse = grid[day]?.[prevSlot];

        if (!prevCourse) {
            return null;
        }

        return (
            <td rowSpan={1} className={emptyClass}></td>
        );
    }
};

const TimetableGrid = ({
    courses,
    onExportImage,
    onRemoveCourse,
    onAddToWishlist,
    onViewCourseDetails,
    onClearAll,
    onShowTimetableList,
    timetableRef,
    isExportingImage,
    showTitle = true,
    isMobile = false
}) => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);

    const timeColumnWidth = isMobile ? '30px' : '36px';

    const totalCredits = courses.reduce((total, course) => total + (course.credits || 0), 0);

    const handleCourseClick = (event, course) => {
        event.preventDefault();
        event.stopPropagation();

        setSelectedCourse(course);
        setMenuPosition({
            x: event.clientX,
            y: event.clientY
        });
        setShowMenu(true);
    };

    const handleCloseMenu = () => {
        setShowMenu(false);
        setSelectedCourse(null);
    };

    const { grid, unscheduledCourses, visibleDays, visibleSlots } = useMemo(() => {
        const newGrid = {};
        daysOfWeek.forEach(day => {
            newGrid[day] = {};
            timeSlots.forEach(slot => {
                newGrid[day][slot] = null;
            });
        });

        const getSlotIndex = (period) => {
            if (isNaN(period) || period < 1) return -1;
            return Math.round((period - 1) * 2);
        };

        const unscheduled = [];

        courses.forEach(course => {
            const times = course.schedules ? parseTime(course.schedules) : parseTimeString(course.time);

            if (times.length === 0) {
                unscheduled.push(course);
                return;
            }

            let mapped = false;
            times.forEach(({ day, start, end }) => {
                if (newGrid[day]) {
                    const startIndex = getSlotIndex(start);
                    const endIndex = getSlotIndex(end);
                    const totalSlots = endIndex - startIndex;

                    if (totalSlots <= 0) return;

                    let isFirstSlot = true;
                    mapped = true;

                    for (let i = startIndex; i < endIndex; i++) {
                        const slotKey = timeSlots[i];
                        if (slotKey && newGrid[day][slotKey] === null) {
                            newGrid[day][slotKey] = {
                                ...course,
                                isStart: isFirstSlot,
                                span: totalSlots,
                            };
                            isFirstSlot = false;
                        }
                    }
                }
            });

            if (!mapped) {
                unscheduled.push(course);
            }
        });

        // 실제 과목이 매핑된 요일/슬롯을 직접 스캔해 표시 범위를 정한다.
        // (시작/끝 교시를 추정하지 않으므로, 트림할 때 과목 칸이 사라지는 일이 없다.)
        const usedDays = new Set();
        let maxSlotIdx = -1;
        daysOfWeek.forEach(day => {
            timeSlots.forEach((slot, slotIdx) => {
                if (newGrid[day][slot]) {
                    usedDays.add(day);
                    if (slotIdx > maxSlotIdx) maxSlotIdx = slotIdx;
                }
            });
        });

        // 모바일: 토요일·야간만 조건부로 숨긴다.
        // 주간(1~9교시)은 항상 표시하고, 야간(야1~)은 야간 과목이 있을 때만 그 범위까지 확장한다.
        let vDays = daysOfWeek;
        let vSlots = timeSlots;
        if (isMobile) {
            const weekdays = ['월', '화', '수', '목', '금'];
            vDays = usedDays.has('토') ? [...weekdays, '토'] : weekdays;

            const WEEKDAY_END_IDX = 17; // 9교시의 마지막 슬롯(주간 끝)
            let endIdx = WEEKDAY_END_IDX;
            if (maxSlotIdx > WEEKDAY_END_IDX) {
                // 야간 과목이 있으면 그 교시 끝까지 확장
                endIdx = maxSlotIdx + (maxSlotIdx % 2 === 0 ? 1 : 0);
            }
            vSlots = timeSlots.slice(0, endIdx + 1);
        }

        return { grid: newGrid, unscheduledCourses: unscheduled, visibleDays: vDays, visibleSlots: vSlots };
    }, [courses, isMobile]);

    const dayColumnWidth = `calc((100% - ${timeColumnWidth}) / ${visibleDays.length})`;

    return (
        <div ref={timetableRef} className={`card mini-timetable ${isMobile ? 'overflow-hidden p-2' : 'p-4'}`}>
            {showTitle && (
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-slate-900">내 시간표</h3>
                        {courses.length > 0 && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                                {totalCredits}학점
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5">
                        {courses.length > 0 && onExportImage && (
                            <button
                                onClick={onExportImage}
                                disabled={isExportingImage}
                                className="icon-btn"
                                title="시간표를 이미지로 저장"
                                aria-label="시간표를 이미지로 저장"
                            >
                                <Download size={15} />
                            </button>
                        )}
                        {courses.length > 0 && onShowTimetableList && (
                            <button
                                onClick={onShowTimetableList}
                                className="icon-btn lg:hidden"
                                title="시간표 리스트 보기"
                                aria-label="시간표 리스트 보기"
                            >
                                <CalendarDays size={15} />
                            </button>
                        )}
                        {courses.length > 0 && onClearAll && (
                            <button
                                onClick={onClearAll}
                                className="icon-btn hover:bg-rose-50 hover:text-rose-500"
                                title="시간표 전체 삭제"
                                aria-label="시간표 전체 삭제"
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {showTitle && courses.length === 0 && (
                <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
                    과목을 추가하면 시간표가 채워져요.
                </p>
            )}

            <div className="w-full">
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                    <table className="w-full table-fixed border-collapse text-xs text-slate-700">
                        <colgroup>
                            <col style={{ width: timeColumnWidth }} />
                            {visibleDays.map(day => (
                                <col key={day} style={{ width: dayColumnWidth }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="border border-slate-100 bg-slate-50/80 p-1"></th>
                                {visibleDays.map(day => (
                                    <th key={day} className={`border border-slate-100 bg-slate-50/80 text-center font-semibold text-slate-500 ${isMobile ? 'py-1 text-[10px]' : 'py-1.5 text-[11px]'}`}>
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleSlots.map((slot) => {
                                const index = timeSlots.indexOf(slot);
                                return (
                                <tr key={slot} style={{ height: '24px' }}>
                                    {slot.endsWith('-1') && (
                                        <td
                                            rowSpan={2}
                                            className={`border border-slate-100 text-center font-medium tabular-nums ${isMobile ? 'p-0.5 text-[9px]' : 'p-1 text-[10px]'} ${slot.startsWith('야') ? 'bg-slate-50 text-blue-500' : 'bg-slate-50/80 text-slate-400'}`}
                                        >
                                            {displayTimeSlots[Math.floor(index / 2)]}
                                        </td>
                                    )}
                                    {visibleDays.map(day => (
                                        <TimeSlotCell
                                            key={`${day}-${slot}`}
                                            day={day}
                                            slot={slot}
                                            index={index}
                                            grid={grid}
                                            onCourseClick={handleCourseClick}
                                        />
                                    ))}
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm bg-white ring-1 ring-slate-200"></span>
                    <span>주간</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200"></span>
                    <span>야간</span>
                </div>
            </div>

            {/* Unscheduled / Online Courses */}
            {unscheduledCourses.length > 0 && (
                <div className="mt-4">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">온라인 · 시간 미지정</h4>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {unscheduledCourses.map((course, idx) => (
                            <button
                                type="button"
                                key={course.id || idx}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-[filter] hover:brightness-95 ${course.color} ${course.textColor}`}
                                onClick={(e) => handleCourseClick(e, course)}
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="truncate text-[11px] font-semibold">{course.name}</div>
                                    <div className="truncate text-[10px] opacity-75">{course.professor} · 온라인</div>
                                </div>
                                <CalendarDays size={13} className="flex-shrink-0 opacity-60" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <TimetableCourseMenu
                isOpen={showMenu}
                onClose={handleCloseMenu}
                course={selectedCourse}
                position={menuPosition}
                onRemove={onRemoveCourse}
                onViewDetails={() => onViewCourseDetails(selectedCourse)}
                onAddToWishlist={onAddToWishlist}
            />
        </div>
    );
};

export default TimetableGrid;
