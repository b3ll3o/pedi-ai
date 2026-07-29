/**
 * Exporta a OpenAPI spec para arquivo YAML.
 *
 * Durante o bootstrap (`src/main.ts`), o `SwaggerModule.createDocument` é
 * serializado em YAML e gravado em `<root>/openapi.yaml` (apenas em
 * dev/staging — gated por `NODE_ENV !== 'production'`).
 *
 * Este script apenas verifica que o arquivo foi produzido e o imprime no
 * stdout para encadear em pipelines locais, sem dependência de build.
 *
 * Uso: node scripts/export-openapi.js
 */
const fs = require('fs');
const path = require('path');

const specPath = path.resolve(__dirname, '..', 'openapi.yaml');

if (fs.existsSync(specPath)) {
  process.stdout.write(fs.readFileSync(specPath, 'utf-8'));
  process.stdout.write('\n');
} else {
  console.error('❌ Spec não encontrada em', specPath);
  console.error('   Inicie a API em dev/staging para que o spec seja gerado:');
  console.error('     pnpm --filter @pedi-ai/api start:dev');
  process.exit(1);
}
