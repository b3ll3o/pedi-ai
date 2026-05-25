/**
 * Contract Testing com Dredd
 *
 * Valida que a API implementada está em conformidade com a OpenAPI spec.
 *
 * Uso:
 *   1. Start API: pnpm start:dev (ou pnpm start)
 *   2. Run tests: node scripts/contract-test.js
 *
 * Em CI/CD, a API precisa estar rodando antes de executar este script.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('http');

const apiUrl = process.env.API_URL || 'http://localhost:3001';
const hookFile = path.resolve(__dirname, 'dredd-hooks.js');
const openApiPath = path.resolve(__dirname, '..', 'openapi.yaml');

async function fetchOpenApiSpec() {
  return new Promise((resolve, reject) => {
    const url = `${apiUrl}/api/docs-json`;
    console.log(`📥 Baixando OpenAPI spec de: ${url}`);

    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const spec = JSON.parse(data);
            // Salva para debug
            fs.writeFileSync(openApiPath, JSON.stringify(spec, null, 2));
            console.log(`✅ OpenAPI spec salva em: ${openApiPath}`);
            resolve(spec);
          } catch (e) {
            reject(new Error(`Failed to parse OpenAPI spec: ${e.message}`));
          }
        });
      })
      .on('error', (e) => {
        reject(new Error(`Failed to fetch OpenAPI spec: ${e.message}. A API está rodando?`));
      });
  });
}

async function runDredd(specPath) {
  console.log('\n🔍 Executando Dredd (contract tests)...\n');

  try {
    execSync(
      `npx dredd "${specPath}" "${apiUrl}" --hookfiles="${hookFile}" --reporter=nyan --language=javascript`,
      {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      }
    );
    console.log('\n✅ Contract tests passed');
  } catch (error) {
    console.error('\n❌ Contract tests failed - API divergiu da spec!');
    console.error('   Execute pnpm build e revise as mudanças na API.');
    process.exit(1);
  }
}

async function main() {
  console.log('🔍 Contract Testing com Dredd');
  console.log(`   API:  ${apiUrl}`);

  try {
    await fetchOpenApiSpec();
    await runDredd(openApiPath);
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    process.exit(1);
  }
}

main();
