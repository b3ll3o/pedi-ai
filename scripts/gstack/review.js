#!/usr/bin/env node

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '../..')

console.log('🔍 GStack Review\n')

const diff = process.argv.includes('--diff')

if (diff) {
  console.log('📋 Analisando arquivos modificados...\n')

  try {
    const files = execSync('git diff --name-only HEAD~1', {
      cwd: ROOT,
      encoding: 'utf-8'
    }).trim().split('\n').filter(f => f)

    console.log(`Encontrados ${files.length} arquivos modificados:\n`)
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))

    console.log('\n✨ Para fazer review detalhado, use Claude Code com o prompt:\n')
    console.log('"Faça code review dos seguintes arquivos:", seguida da lista acima')
  } catch (e) {
    console.log('Erro ao obter diff:', e.message)
  }
} else {
  console.log('Executando verificação básica...\n')

  console.log('1. Build...')
  try {
    execSync('pnpm build', { cwd: ROOT, stdio: 'pipe' })
    console.log('   ✅ Build passou\n')
  } catch (e) {
    console.log('   ❌ Build falhou\n')
  }

  console.log('2. Lint...')
  try {
    execSync('pnpm lint', { cwd: ROOT, stdio: 'pipe' })
    console.log('   ✅ Lint passou\n')
  } catch (e) {
    console.log('   ⚠️ Lint tem warnings\n')
  }

  console.log('3. Type check...')
  try {
    execSync('pnpm tsc --noEmit', { cwd: ROOT, stdio: 'pipe' })
    console.log('   ✅ Type check passou\n')
  } catch (e) {
    console.log('   ❌ Type check falhou\n')
  }

  console.log('4. Coverage...')
  try {
    execSync('pnpm test:coverage', { cwd: ROOT, stdio: 'pipe' })
    console.log('   ✅ Coverage passou\n')
  } catch (e) {
    console.log('   ⚠️ Coverage abaixo do limiar\n')
  }

  console.log('📝 Para review detalhado de código, use Claude Code com:')
  console.log('   /review\n')
}