#!/usr/bin/env node

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../..')

const url = process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:3000'

console.log('🧪 GStack QA\n')
console.log(`URL: ${url}\n`)

console.log('1. Verificando se servidor está rodando...')
try {
  execSync(`curl -s ${url} > /dev/null`, { stdio: 'pipe' })
  console.log('   ✅ Servidor está respondendo\n')
} catch (e) {
  console.log('   ❌ Servidor não está respondendo')
  console.log('   Execute: pnpm dev\n')
  process.exit(1)
}

console.log('2. Executando testes E2E...')
try {
  execSync('pnpm test:e2e', {
    cwd: ROOT,
    stdio: 'inherit'
  })
  console.log('\n   ✅ E2E tests passaram\n')
} catch (e) {
  console.log('\n   ❌ E2E tests falharam\n')
  process.exit(1)
}

console.log('3. Gerando relatório Playwright...')
try {
  execSync('pnpm playwright show-report', {
    cwd: ROOT,
    stdio: 'pipe'
  })
} catch (e) {
  console.log('   Relatório disponível em: playwright-report/index.html')
}

console.log('\n✨ QA completo!')