import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright reports (generated, not source code)
    "tests/e2e/playwright-report/**",
    "test-results/**",
    "playwright-traces/**",
  ]),
  // DDD Domain Layer Rules - Block cross-layer imports
  {
    name: 'ddd/domain-layer-rules',
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['warn', {
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
        ]
      }]
    },
  },
  // Test files: allow explicit any and @ts-nocheck (common in mocks and dynamic types)
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    rules: {
      // Ignore unused vars that start with underscore
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
      }],
    },
  },
]);

export default eslintConfig;
