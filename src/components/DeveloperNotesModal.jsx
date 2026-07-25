import { useRef } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import useModalDismiss from '../hooks/useModalDismiss';

const developerNoteEntries = [
  {
    date: '2026.06.13',
    title: '서비스 UI와 온라인 과목 정리',
    items: [
      '검색 결과를 한 줄 리스트 중심으로 정리했습니다.',
      '온라인 과목을 필터로 찾을 수 있게 하고 표시 문구를 정리했습니다.',
      '모바일 버튼, 위시리스트, 조합 결과 화면의 사용성을 다듬었습니다.',
      '사이트 footer에서 확인할 수 있는 개발자 노트를 추가했습니다.',
      '회원 탈퇴 시 계정은 익명화하고 누적 이용 통계는 보존하도록 정리했습니다.',
    ],
  },
  {
    date: '2026.06.12',
    title: '로그인과 검색 성능 개선',
    items: [
      '로그인 세션과 개인 시간표 접근 흐름을 정리했습니다.',
      '다음 학기 데이터 교체를 위한 과목 업로드 흐름을 분리했습니다.',
      '과목 검색 속도를 안정적으로 유지하기 위한 캐시와 warm-up 방향을 검증했습니다.',
      '검색 노출을 위해 메타데이터, robots, sitemap 구성을 점검했습니다.',
    ],
  },
  {
    date: '2026.05.22',
    title: '프로젝트 소개 문서 정리',
    items: [
      '서비스 구조와 주요 기능을 설명하는 README를 정리했습니다.',
      '성능 개선, 데이터 파싱, 시간표 조합 기능의 작업 배경을 문서화했습니다.',
    ],
  },
  {
    date: '2026.04.29',
    title: '과목 관리와 공식 데이터 import 준비',
    items: [
      '공식 과목 데이터를 관리할 수 있는 내부 도구를 준비했습니다.',
      '공식 과목 엑셀을 미리보기한 뒤 반영할 수 있는 흐름을 만들었습니다.',
      '중복 과목과 학기별 과목 데이터 충돌을 줄이기 위한 검증을 보강했습니다.',
    ],
  },
  {
    date: '2026.03.31',
    title: '검색 필터와 화면 동작 보강',
    items: [
      '학과, 이수구분, 학점 등 검색 필터 동작을 강화했습니다.',
      '검색 결과와 시간표 화면의 행 표시 방식을 조정했습니다.',
      '불필요한 문의 UI와 자잘한 화면 버그를 정리했습니다.',
    ],
  },
  {
    date: '2026.02.14',
    title: '계정과 학기 데이터 정합성 개선',
    items: [
      '회원 탈퇴 UI와 API 흐름을 연결했습니다.',
      '학기 기준으로 시간표와 위시리스트가 섞이지 않도록 정리했습니다.',
      '비밀번호 저장 방식과 데이터 중복 방지 제약을 보강했습니다.',
    ],
  },
  {
    date: '2026.02.03',
    title: '모바일 시간표와 필터 편의성 개선',
    items: [
      '모바일에서 시간표를 더 쉽게 확인할 수 있도록 화면을 조정했습니다.',
      '야간 과목과 학점 필터 관련 오류를 수정했습니다.',
      '과목 추가 시 중복 클릭으로 생길 수 있는 문제를 줄였습니다.',
    ],
  },
  {
    date: '2026.01.10',
    title: '과목 파싱과 시간표 조합 기반 정리',
    items: [
      'PDF/엑셀에서 가져온 과목 데이터 검증 흐름을 정리했습니다.',
      '공강 요일 조건을 시간표 조합 요청에 반영했습니다.',
      '학과명 줄임말과 과목 데이터 파싱 규칙을 보강했습니다.',
    ],
  },
  {
    date: '2025.08.04',
    title: '시간표 조합 서비스 시작',
    items: [
      '과목 검색, 위시리스트, 시간표 조합 생성의 기본 흐름을 구현했습니다.',
      '백엔드 API와 프론트 화면을 연결해 실제 시간표를 만들 수 있게 했습니다.',
    ],
  },
];

const upcomingDeveloperNotes = [
  '계정 설정 화면 세부 정리',
  '다음 학기 과목 업로드와 학기 전환 기능',
  '인기 과목과 위시리스트 기반 통계',
  '시간표 공유와 이미지 내보내기 개선',
];

const DeveloperNotesModal = ({ onClose }) => {
  const panelRef = useRef(null);
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="developer-notes-title" className="modal-panel max-h-[88svh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">서비스 개선 기록</p>
            <h2 id="developer-notes-title" className="mt-1 text-lg font-bold text-slate-900">개발자 노트</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="개발 노트 닫기">
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[calc(88svh-4.5rem)] overflow-y-auto overscroll-contain px-5 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <ol className="space-y-4">
            {developerNoteEntries.map((entry) => (
              <li key={entry.date} className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3">
                <time className="pt-0.5 text-xs font-semibold tabular-nums text-slate-400">{entry.date}</time>
                <div className="border-l border-slate-200 pl-4">
                  <h3 className="text-sm font-bold text-slate-900">{entry.title}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {entry.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900">업데이트 예정</h3>
            <ul className="mt-2 space-y-1.5">
              {upcomingDeveloperNotes.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-500">
                  <Info size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperNotesModal;
