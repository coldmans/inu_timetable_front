module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    'scripts',
    'playwright-report',
    'test-results',
    '.eslintrc.cjs',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react-refresh/only-export-components': 'off',
    // 배포 전 위생: 디버그용 콘솔은 금지하되 dev 전용 debug 와 에러/경고 로깅은 허용한다.
    'no-console': ['error', { allow: ['debug', 'warn', 'error'] }],
    // jsx-runtime 환경에서 관례적으로 남아 있는 React 기본 임포트는 허용한다.
    'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
  },
  overrides: [
    {
      files: ['vite.config.js', 'playwright.config.js', 'vercel.mjs'],
      env: { node: true },
    },
    {
      files: ['tests/**/*.js'],
      env: { node: true },
    },
  ],
};
