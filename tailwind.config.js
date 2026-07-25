/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        // 마우스 환경에서만 적용되는 변형. 터치 기기는 화면 폭과 무관하게(가로 모드 포함)
        // 44px급 터치 타겟을 유지하기 위해 폭(sm:) 대신 포인터 종류로 축소를 분기한다.
        fine: { raw: '(pointer: fine)' },
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Segoe UI"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
