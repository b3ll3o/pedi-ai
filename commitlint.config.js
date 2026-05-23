/**
 * Commitlint configuration — Conventional Commits
 *
 * Rules:
 * - type: obrigatório (feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert)
 * - scope: opcional (api, web, shared, infra, etc.)
 * - subject: obrigatório, min 10 chars, max 100 chars
 * - header: max 100 chars
 *
 * Formato aceito:
 *   feat(api): add novo endpoint de usuarios
 *   fix(web): corrige bug no carrinho offline
 *   docs: atualiza README
 *   chore: update dependencias
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Header format: type(scope): subject
    'header-max-length': [2, 'always', 100],
    'header-min-length': [2, 'always', 10],

    // Subject: não pode terminar com ponto
    'subject-full-stop': [2, 'never', '.'],

    // Type: enumerated (padrão conventional commits)
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nova funcionalidade
        'fix', // Correção de bug
        'docs', // Mudança de documentação
        'style', // Formatação, estilo (não muda lógica)
        'refactor', // Refatoração (não feat nem fix)
        'perf', // Melhoria de performance
        'test', // Adição/correção de testes
        'build', // Mudança de build ou deps
        'ci', // Mudança de CI/CD
        'chore', // Tarefas gerais, manutenção
        'revert', // Reversão de commit anterior
      ],
    ],

    // Scope: case insensitive, permitindo múltiplos scopes
    'scope-case': [2, 'always', 'lower-case'],
  },
  parserPreset: 'conventional-changelog-writer',
};
