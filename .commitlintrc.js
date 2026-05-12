module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova feature
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação (não muda lógica)
        'refactor', // Refatoração (não muda funcionalidade)
        'perf',     // Performance
        'test',     // Testes
        'build',    // Build
        'ci',       // CI/CD
        'chore',    // Tarefas gerais
        'revert',   // Reverter commit
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
}