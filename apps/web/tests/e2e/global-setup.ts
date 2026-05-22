import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

/**
 * Global setup for E2E tests.
 *
 * Responsabilities:
 * 1. Validar DATABASE_URL
 * 2. Executar seed com cache (criado pelo seed.ts)
 *
 * Tudo mais (pré-aquecimento do browser, escrita de cache de rede)
 * foi removido — não agrega valor e adiciona tempo.
 */
const globalSetup = async () => {
  console.log('========================================')
  console.log('🚀 E2E Global Setup')
  console.log('========================================\n')

  // 1. Validar DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.log('⚠️ DATABASE_URL não configurada. Pulando seed E2E.')
    console.log('Defina DATABASE_URL no .env.e2e para executar os testes.\n')
    return
  }

  // 2. Seed com cache — seed.ts grava .seed-result.json que é verificado antes de rodar
  const seedResultPath = path.join(__dirname, 'scripts', '.seed-result.json')
  let seedValid = false
  try {
    if (fs.existsSync(seedResultPath)) {
      const result = JSON.parse(fs.readFileSync(seedResultPath, 'utf-8'))
      if (result.restaurant?.id && result.users?.customer?.id) {
        console.log('✅ Seed cache válido, pulando seed.')
        seedValid = true
      }
    }
  } catch {
    // Cache inválido, rodar seed
  }

  if (!seedValid) {
    console.log('🌱 Executando seed E2E...')
    try {
      const { stdout, stderr } = await execAsync('pnpm test:e2e:seed', {
        cwd: path.join(__dirname, '..'),
        timeout: 180_000,
      })
      if (stdout) console.log(stdout)
      if (stderr) console.warn(stderr)
      console.log('✅ Seed concluído.\n')
    } catch (error) {
      console.error('❌ Seed falhou:', error)
      throw error
    }
  }

  console.log('========================================')
  console.log('✅ Global Setup Completo')
  console.log('========================================\n')
}

export default globalSetup
