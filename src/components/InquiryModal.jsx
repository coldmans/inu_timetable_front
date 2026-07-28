import { useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import useModalDismiss from '../hooks/useModalDismiss';
import { inquiryAPI } from '../services/api';

const MAX_CONTENT_LENGTH = 1000;
const MAX_CONTACT_LENGTH = 100;

// 인스타 DM 링크 대신 앱 안에서 바로 문의를 남기는 모달.
// 비로그인도 접수할 수 있어서 답변받을 연락처는 선택 입력으로 둔다.
const InquiryModal = ({ onClose, onSubmitted }) => {
  const panelRef = useRef(null);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  useFocusTrap(true, panelRef);
  useModalDismiss(true, onClose);

  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await inquiryAPI.submit({
        content: trimmedContent,
        contact: contact.trim() || null,
      });
      onSubmitted?.(result?.message || '문의가 접수되었습니다.');
      onClose();
    } catch (error) {
      setErrorMessage(error.message || '문의 접수에 실패했어요. 잠시 후 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inquiry-title" className="modal-panel max-h-[88svh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-900/10 focus:outline-none sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">불편한 점이나 궁금한 점을 남겨주세요</p>
            <h2 id="inquiry-title" className="mt-1 text-lg font-bold text-slate-900">문의하기</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn h-9 w-9" aria-label="문의하기 닫기">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(88svh-4.5rem)] overflow-y-auto overscroll-contain px-5 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <label htmlFor="inquiry-content" className="block text-sm font-semibold text-slate-700">
            문의 내용
          </label>
          <textarea
            id="inquiry-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
            rows={6}
            required
            placeholder="예) 시간표 조합이 안 만들어져요 / 이런 기능이 있으면 좋겠어요"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">
            {content.length}/{MAX_CONTENT_LENGTH}
          </p>

          <label htmlFor="inquiry-contact" className="mt-3 block text-sm font-semibold text-slate-700">
            답변받을 연락처 <span className="font-normal text-slate-400">(선택)</span>
          </label>
          <input
            id="inquiry-contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value.slice(0, MAX_CONTACT_LENGTH))}
            placeholder="이메일이나 인스타 아이디 등"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-2 text-xs leading-5 text-slate-400">
            로그인 상태로 문의하면 계정 정보가 함께 전달돼 더 정확한 안내를 받을 수 있어요.
          </p>

          {errorMessage && (
            <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-inset ring-rose-100" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary mt-4 h-11 w-full rounded-xl text-[15px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                접수 중...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send size={15} /> 문의 보내기
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InquiryModal;
