/**
 * Dredd Hooks - Personaliza comportamento dos contract tests
 *
 * Hooks são executados antes/depois de cada requisição da API.
 * Útil para:
 *   - Autenticação (obter token JWT antes de testar rotas protegidas)
 *   - Setup de dados de teste
 *   - Ignorar endpoints não implementados
 *   - Manipular timestamps/dados dinâmicos
 */
const hook = require('@dredd/apiary-hooks').default;

let authToken = null;

/**
 * Obter token JWT para rotas protegidas
 */
hook.beforeEach(function (transaction) {
  // Ignora transactions que não requerem auth
  if (!transaction.request.headers || !transaction.request.headers['Authorization']) {
    return;
  }
});

/**
 * Hook antes de cada operação autenticada
 */
hook.before('auth > POST /api/auth/login', function (transaction) {
  // Exemplo: forçar credenciais de teste
  // transaction.request.body = JSON.stringify({
  //   email: 'test@example.com',
  //   password: 'testpassword',
  // });
});

/**
 * Remover campos dinâmicos da resposta para comparação
 */
hook.afterEach(function (transaction) {
  // Ignora campos que mudam a cada execução (timestamps, IDs)
  if (transaction.response.body) {
    try {
      const body =
        typeof transaction.response.body === 'string'
          ? JSON.parse(transaction.response.body)
          : transaction.response.body;

      // Remove campos dinâmicos
      if (body.data && body.data.id) {
        delete body.data.id;
      }
      if (body.timestamp) {
        delete body.timestamp;
      }

      transaction.response.body = JSON.stringify(body);
    } catch (e) {
      // Body não é JSON, ignora
    }
  }
});

module.exports = hook;
