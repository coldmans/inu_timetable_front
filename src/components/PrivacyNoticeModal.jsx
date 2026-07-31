import { ShieldCheck, X } from 'lucide-react';
import { useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import useModalDismiss from '../hooks/useModalDismiss';

const PrivacyNoticeModal = ({ onClose }) => {
  const panelRef = useRef(null);
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-notice-title"
        className="modal-panel max-h-[88svh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
              <ShieldCheck size={14} /> 서비스 이용 정보
            </p>
            <h2 id="privacy-notice-title" className="mt-1 text-lg font-bold text-slate-900">개인정보 및 분석 안내</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="개인정보 및 분석 안내 닫기">
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[calc(88svh-4.5rem)] space-y-5 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(env(safe-area-inset-bottom),16px)] text-sm leading-6 text-slate-600">
          <section>
            <h3 className="font-semibold text-slate-900">Google Analytics 사용</h3>
            <p className="mt-1">
              서비스 품질과 이용 흐름을 개선하기 위해 Google Analytics를 사용합니다. 이 과정에서
              페이지 방문, 브라우저·기기 정보, 대략적인 지역, 검색·시간표·위시리스트 기능의 이용
              여부와 같은 정보가 쿠키 또는 유사 기술을 통해 처리될 수 있습니다.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">보내지 않는 정보</h3>
            <p className="mt-1">
              이름, 학번, 로그인 계정, 검색어, 과목명은 Google Analytics 이벤트에 포함하지 않습니다.
              광고 개인 최적화와 Google 신호 수집도 사용하지 않습니다.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">처리 목적과 거부 방법</h3>
            <p className="mt-1">
              수집된 분석 정보는 방문 현황과 기능 사용성을 파악하는 용도로만 사용하며, Google의
              정책과 이 서비스의 Analytics 설정에 따라 처리됩니다. 브라우저에서 쿠키를 차단하거나
              삭제하면 관련 수집을 제한할 수 있습니다.
            </p>
          </section>

          <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-100">
            <a
              href="https://policies.google.com/technologies/partner-sites?hl=ko"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4 hover:text-blue-700"
            >
              Google이 파트너 사이트의 정보를 사용하는 방식
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNoticeModal;
