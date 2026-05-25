/**
 * Exporta a OpenAPI spec para arquivo YAML.
 * Executado após o build da API.
 *
 * Uso: node scripts/export-openapi.js
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// O main.js exporta o spec durante o bootstrap da API
// Este script é executado separadamente para gerar o YAML standalone

const distPath = path.resolve(__dirname, '..', 'dist', 'openapi.yaml');
const outputPath = path.resolve(__dirname, '..', 'openapi.yaml');

if (fs.existsSync(distPath)) {
  fs.copyFileSync(distPath, outputPath);
  console.log(`✅ OpenAPI spec exportada para: ${outputPath}`);
} else {
  console.error('❌ Build a API primeiro: pnpm build');
  process.exit(1);
}
