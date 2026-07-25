import { useEffect, useRef, useState } from 'react';
import { CalendarClock, FileSpreadsheet, X } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import useModalDismiss from '../hooks/useModalDismiss';
import { updateLogAPI } from '../services/api';

const SOURCE_FORMAT_LABELS = {
  OFFICIAL_TIMETABLE: '공식 종합강의시간표',
  SYLLABUS: '강의계획서 조회',
};

const formatLogDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// 과목 데이터 반영 이력(서버 기록)을 보여주는 업데이트 소식 모달.
const DeveloperNotesModal = ({ onClose }) => {
  const panelRef = useRef(null);
  const [logs, setLogs] = useState(null); // null = 로딩, [] = 내역 없음
  const [loadFailed, setLoadFailed] = useState(false);
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  useEffect(() => {
    let isMounted = true;
    updateLogAPI.getRecent()
      .then(data => {
        if (isMounted) setLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (isMounted) {
          setLogs([]);
          setLoadFailed(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="developer-notes-title" className="modal-panel max-h-[88svh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">과목 데이터 반영 기록</p>
            <h2 id="developer-notes-title" className="mt-1 text-lg font-bold text-slate-900">업데이트 소식</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="업데이트 소식 닫기">
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[calc(88svh-4.5rem)] overflow-y-auto overscroll-contain px-5 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <p className="mb-4 text-sm leading-6 text-slate-500">
            학교 공식 데이터가 반영된 이력이에요. 과목 시간이 바뀌어 내 시간표의 다른 과목과
            겹치면 해당 과목을 자동으로 빼고 알려드립니다.
          </p>

          {logs === null ? (
            <ul className="space-y-3">
              {[0, 1, 2].map(index => (
                <li key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </ul>
          ) : logs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400 ring-1 ring-inset ring-slate-100">
              {loadFailed ? '업데이트 내역을 불러오지 못했어요. 잠시 후 다시 열어주세요.' : '아직 기록된 업데이트가 없어요.'}
            </p>
          ) : (
            <ol className="space-y-3">
              {logs.map(log => (
                <li key={`${log.appliedAt}-${log.semester}`} className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-100">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CalendarClock size={14} className="flex-shrink-0 text-blue-500" />
                    <time className="text-xs font-semibold tabular-nums text-slate-500">{formatLogDate(log.appliedAt)}</time>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{log.semester} 학기</span>
                    {SOURCE_FORMAT_LABELS[log.sourceFormat] && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        <FileSpreadsheet size={11} /> {SOURCE_FORMAT_LABELS[log.sourceFormat]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">
                    과목 데이터 반영 — 추가 <span className="font-semibold text-emerald-600">{log.addedCount}</span>
                    {' · '}변경 <span className="font-semibold text-amber-600">{log.modifiedCount}</span>
                    {' · '}비활성 <span className="font-semibold text-rose-500">{log.removedCount}</span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeveloperNotesModal;
