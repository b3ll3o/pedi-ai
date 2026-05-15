#!/usr/bin/env node

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../..')

const isDryRun = process.argv.includes('--dry-run')

console.log('🚀 GStack Ship\n')
console.log(`Modo: ${isDryRun ? 'DRY-RUN' : 'PRODUÇÃO'}\n`)

const steps = [
  { name: 'Sync main', cmd: 'git fetch origin main && git rebase origin/main' },
  { name: 'Run tests', cmd: 'pnpm test:unit' },
  { name: 'Run build', cmd: 'pnpm build' },
  { name: 'Run lint', cmd: 'pnpm lint' },
  { name: 'Run type-check', cmd: 'pnpm tsc --noEmit' },
  { name: 'Run coverage', cmd: 'pnpm test:coverage' },
]

for (const step of steps) {
  console.log(`📦 ${step.name}...`)
  if (isDryRun) {
    console.log(`   [dry-run] would execute: ${step.cmd}`)
  } else {
    try {
      execSync(step.cmd, { cwd: ROOT, stdio: 'pipe' })
      console.log(`   ✅ ${step.name} passou`)
    } catch (_e) {
      console.log(`   ❌ ${step.name} falhou`)
      console.log(`   Comando: ${step.cmd}`)
      process.exit(1)
    }
  }
}

console.log('\n')

if (isDryRun) {
  console.log('✨ Dry-run completo! Nenhuma alteração foi feita.')
  console.log('Para executar, rode: pnpm gstack:ship')
} else {
  console.log('✅ Todos os checks passaram!')
  console.log('\nPróximos passos:')
  console.log('1. Crie uma branch: git checkout -b feat/minha-feature')
  console.log('2. Commit suas mudanças')
  console.log('3. Push: git push origin feat/minha-feature')
  console.log('4. Abra um PR no GitHub')
}