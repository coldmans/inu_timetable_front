module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'scripts', 'tests', '.eslintrc.cjs', 'playwright.config.*'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react-refresh/only-export-components': 'off',
    // 배포 전 위생: 디버그용 콘솔은 금지하되 에러/경고 로깅은 허용한다.
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // jsx-runtime 환경에서 관례적으로 남아 있는 React 기본 임포트는 허용한다.
    'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
  },
  overrides: [
    { files: ['vite.config.js'], env: { node: true } },
  ],
};
