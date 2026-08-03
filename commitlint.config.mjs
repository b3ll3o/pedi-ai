/**
 * Commitlint — Conventional Commits em pt-BR.
 * Superset das duas configs anteriores, endurecidas para o monorepo pedi-ai.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  parserPreset: 'conventional-changelog-conventionalcommits',
  rules: {
    'header-max-length': [2, 'always', 100],
    'header-min-length': [2, 'always', 10],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],
    'scope-enum': [
      2,
      'always',
      [
        // Bounded contexts (DDD)
        'pedido',
        'cardapio',
        'mesa',
        'pagamento',
        'autenticacao',
        'admin',
        'shared',
        // Áreas transversais
        'web',
        'api',
        'infra',
        'docs',
        'deps',
        'ci',
        'e2e',
        'husky',
        'docker',
        'rtm',
        'openspec',
      ],
    ],
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
