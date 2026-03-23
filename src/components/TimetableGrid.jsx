import React, { useState, useMemo } from 'react';
import { Download, CalendarDays, X } from 'lucide-react';
import TimetableCourseMenu from './TimetableCourseMenu';
import { parseTime, parseTimeString, daysOfWeek, timeSlots, displayTimeSlots } from '../utils/timetableUtils';

const TimeSlotCell = ({ day, slot, index, grid, onCourseClick }) => {
    const course = grid[day]?.[slot];
    const isFirstHalf = slot.endsWith('-1');
    const emptyClass = `border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-100' : 'bg-white'}`;

    // Case 1: Course exists
    if (course) {
        if (course.isStart) {
            const backgroundColor = course.color || 'bg-blue-100';
            const borderColor = course.borderColor || 'border-blue-400'; // App.jsx has border-blue-400 in formatCourse
            const textColor = course.textColor || 'text-slate-900';
            return (
                <td
                    rowSpan={course.span || 1}
                    className={`align-top p-1 ${backgroundColor} ${borderColor} ${textColor} border cursor-pointer transition-colors hover:brightness-95 overflow-hidden`}
                    onClick={(e) => onCourseClick(e, course)}
                >
                    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-center overflow-hidden">
                        <div className="w-full px-0.5 text-[11px] font-semibold leading-tight break-words overflow-hidden">{course.name}</div>
                        {course.professor && (
                            <div className="w-full px-0.5 text-[10px] leading-none opacity-80 truncate">{course.professor}</div>
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
    onExportPDF,
    onRemoveCourse,
    onAddToWishlist,
    onViewCourseDetails,
    onClearAll,
    onShowTimetableList,
    timetableRef,
    isExportingPDF,
    showTitle = true,
    isMobile = false
}) => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);

    const timeColumnWidth = '40px';
    const dayColumnWidth = isMobile ? '80px' : `calc((100% - ${timeColumnWidth}) / ${daysOfWeek.length})`;

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

    const { grid, unscheduledCourses } = useMemo(() => {
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
        return { grid: newGrid, unscheduledCourses: unscheduled };
    }, [courses]);

    return (
        <div ref={timetableRef} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mini-timetable ${isMobile ? 'overflow-x-auto overflow-y-visible' : ''}`}>
            {showTitle && (
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 tracking-tight">내 시간표</h3>
                        {courses.length > 0 && (
                            <p className="mt-1 text-sm text-slate-500">
                                총 {courses.reduce((total, course) => total + (course.credits || 0), 0)}학점
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                        {courses.length > 0 && onExportPDF && (
                            <button
                                onClick={onExportPDF}
                                disabled={isExportingPDF}
                                className="p-2 rounded-full transition-colors hover:bg-slate-100 disabled:opacity-60 disabled:hover:bg-transparent"
                                title="시간표를 PDF로 저장"
                            >
                                <Download size={18} />
                            </button>
                        )}
                        {courses.length > 0 && onShowTimetableList && (
                            <button
                                onClick={onShowTimetableList}
                                className="p-2 rounded-full transition-colors hover:bg-slate-100 lg:hidden"
                                title="시간표 리스트 보기"
                            >
                                <CalendarDays size={18} />
                            </button>
                        )}
                        {courses.length > 0 && onClearAll && (
                            <button
                                onClick={onClearAll}
                                className="p-2 rounded-full transition-colors hover:bg-rose-100"
                                title="시간표 전체 삭제"
                            >
                                <X size={18} className="text-rose-500" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={isMobile ? 'min-w-[500px]' : 'w-full'}>
                <table className="w-full border-collapse border border-slate-200 table-fixed text-xs text-slate-700">
                    <colgroup>
                        <col style={{ width: timeColumnWidth }} />
                        {daysOfWeek.map(day => (
                            <col key={day} style={{ width: dayColumnWidth }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="bg-slate-50 p-1 text-center font-semibold text-[11px] text-slate-500 border border-slate-200"></th>
                            {daysOfWeek.map(day => (
                                <th key={day} className="bg-slate-50 p-1 text-center font-semibold text-[11px] text-slate-600 border border-slate-200">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, index) => {
                            const isTopBorder = index > 0 && slot.endsWith('-1') && !slot.startsWith('야1');
                            const isNightTopBorder = slot === '야1-1';
                            return (
                                <tr
                                    key={slot}
                                    style={{ height: '24px' }}
                                    className={`${isTopBorder ? 'border-t border-slate-200' : ''} ${isNightTopBorder ? 'border-t border-blue-200' : ''}`}
                                >
                                    {slot.endsWith('-1') && (
                                        <td
                                            rowSpan={2}
                                            className={`text-center p-1 font-medium text-[11px] border border-slate-200 ${slot.startsWith('야') ? 'bg-slate-100 text-blue-600' : 'bg-slate-50 text-slate-500'}`}
                                        >
                                            {displayTimeSlots[Math.floor(index / 2)]}{slot.startsWith('야') ? '' : '교시'}
                                        </td>
                                    )}
                                    {daysOfWeek.map(day => (
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

            <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-3 rounded-sm bg-white border border-slate-200"></span>
                        <span>주간</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-3 rounded-sm bg-slate-100 border border-slate-200"></span>
                        <span>야간</span>
                    </div>
                </div>
            </div>

            {/* Unscheduled / Online Courses */}
            {unscheduledCourses.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">온라인 / 시간외 과목</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unscheduledCourses.map((course, idx) => (
                            <div
                                key={course.id || idx}
                                className={`flex items-center justify-between p-3 rounded-xl border ${course.color} ${course.borderColor} ${course.textColor} cursor-pointer hover:brightness-95 transition-all shadow-sm`}
                                onClick={(e) => handleCourseClick(e, course)}
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="text-[11px] font-bold truncate">{course.name}</div>
                                    <div className="text-[10px] opacity-80 truncate">
                                        {course.professor} • 온라인
                                    </div>
                                </div>
                                <CalendarDays size={14} className="flex-shrink-0 opacity-60" />
                            </div>
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
