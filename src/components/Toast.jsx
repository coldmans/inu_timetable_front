import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const toastIcons = {
  success: <CheckCircle2 size={17} className="flex-shrink-0 text-emerald-500" />,
  warning: <AlertTriangle size={17} className="flex-shrink-0 text-amber-500" />,
  error: <XCircle size={17} className="flex-shrink-0 text-rose-500" />,
  info: <Info size={17} className="flex-shrink-0 text-blue-500" />,
};

export const Toast = ({ message, show, type, onDismiss }) => (
  <div
    role="status"
    aria-live="polite"
    className={`fixed left-1/2 top-4 z-[60] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-xl bg-white py-2.5 pl-3.5 pr-2 shadow-lg ring-1 ring-slate-900/10 transition-all duration-200 ease-out ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}
  >
    {toastIcons[type] || toastIcons.info}
    <span className="text-sm font-medium text-slate-800">{message}</span>
    <button onClick={onDismiss} aria-label="알림 닫기" className="icon-btn h-9 w-9">
      <X size={14} />
    </button>
  </div>
);

export const LoadingOverlay = ({ isGenerating }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) return undefined;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30); // 3초 동안 100% 채우기

    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="modal-panel flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-7 shadow-xl ring-1 ring-slate-200">
        <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" aria-hidden="true"></div>
        <div className="text-center">
          <p className="text-gray-900 text-lg font-semibold">시간표 조합을 준비하고 있어요</p>
          <p className="text-sm text-gray-500">잠시만 기다려 주세요</p>
        </div>
        <div className="w-52 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-xs font-medium text-gray-500">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

