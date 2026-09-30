import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['**/dist/**', 'coverage', 'playwright-report', 'test-results'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2020 },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'ImportExpression', message: 'Domain modules must use static imports.' },
        { selector: 'CallExpression[callee.name="require"]', message: 'Domain modules must use static ESM imports.' },
      ],
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^(?!\\.{1,2}/|date-fns$)', message: 'Domain dependencies must be internal relative imports or date-fns.' },
          { regex: '(^|/)(apps|tests)(/|$)', message: 'Domain source cannot depend on applications or tests.' },
        ],
      }],
    },
  },
  {
    files: ['packages/domain/tests/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { regex: '^(?!\\.{1,2}/|vitest$|@shiftly/domain$|node:)', message: 'Domain tests must not depend on web or browser frameworks.' },
          { regex: '(^|/)apps(/|$)', message: 'Domain tests cannot depend on applications.' },
        ],
      }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/domain', '@/domain/**', '@shiftly/domain/*', '@shiftly/domain/**'], message: 'Consume the engine through @shiftly/domain.' },
          { regex: '(^|/)packages/domain(/|$)', message: 'Use the public package API, not a relative domain path.' },
        ],
      }],
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.worker,
        Deno: 'readonly',
      },
    },
  },
)
