import { defineConfig } from 'eslint/config';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

import rootIgnores from '../../eslint.config.mjs';

const eslintConfig = defineConfig([
  // Monorepo-wide ignores (root)
  ...rootIgnores,

  // TypeScript files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    rules: {
      // Disable conflicting prettier rules
      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'warn',

      // Prettier + import
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unresolved': 'off',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',

      // NestJS conventions
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/camelcase': 'off',

      // General
      'prefer-const': 'warn',
      'no-var': 'error',

      // Complexity limit — AGENTS.md: threshold = 15
      complexity: ['error', { max: 15 }],
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    // Re-declara os plugins aqui também — sem isso, regras
    // `@typescript-eslint/*` referenciadas via `// eslint-disable-next-line`
    // em arquivos de teste resultam em "Definition for rule 'X' was not
    // found" mesmo quando X está declarada como `off` em `rules`. O ESLint
    // precisa conhecer o plugin para silenciar a diretiva.
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // JavaScript files (nest-cli, etc)
  {
    files: ['*.js', '*.mjs'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
]);

export default eslintConfig;
