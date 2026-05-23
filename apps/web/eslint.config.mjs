import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

import rootIgnores from '../../eslint.config.mjs';

const eslintConfig = defineConfig([
  // Monorepo-wide ignores (root)
  ...rootIgnores,

  // Ignore Workbox service worker (TypeScript syntax in .js)
  { ignores: ['public/sw.js'] },

  // Next.js core web vitals + TypeScript
  ...nextVitals,
  ...nextTs,

  // Prettier + import ordering
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'warn',
      // Import ordering (DDD-aware)
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': 'off', // handled by TypeScript
    },
  },

  // DDD Domain Layer Rules - Block cross-layer imports
  {
    name: 'ddd/domain-layer-rules',
    files: ['apps/web/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            'react',
            'next',
            '@/infrastructure/**',
            '@/presentation/**',
            '@/components/**',
            '@/hooks/**',
            '@/lib/**',
            '@/services/**',
            '@/stores/**',
          ],
        },
      ],
    },
  },

  // Test files: allow explicit any and @ts-nocheck (common in mocks and dynamic types)
  // Also disable import/order — vi.mock hoisting often requires imports interspersed with mocks
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'import/order': 'off',
    },
  },

  // Source files: disable no-explicit-any (legacy codebase has dynamic types)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    rules: {
      // Ignore unused vars that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Complexity limit — AGENTS.md: threshold = 15
      // Usar 'error' para bloquear CI; 'warn' para apenas notificar localmente
      complexity: ['error', { max: 15 }],
    },
  },
]);

export default eslintConfig;
