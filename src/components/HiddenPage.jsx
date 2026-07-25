import { SearchX } from 'lucide-react';

const HiddenPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
    <div className="max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <SearchX size={22} />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        주소가 바뀌었거나 더 이상 제공되지 않는 화면입니다.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        시간표로 돌아가기
      </a>
    </div>
  </div>
);

export default HiddenPage;
