#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

function getChanges() {
  const changesDir = path.join(ROOT, 'openspec/changes')
  const entries = fs.readdirSync(changesDir, { withFileTypes: true })

  const active = []
  const archived = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'archive') {
      const archiveDir = path.join(changesDir, 'archive')
      const archiveEntries = fs.readdirSync(archiveDir, { withFileTypes: true })
      for (const a of archiveEntries) {
        if (a.isDirectory()) {
          archived.push(a.name)
        }
      }
    } else {
      active.push(entry.name)
    }
  }

  return { active, archived }
}

function getIssues(changesPath) {
  const issuesPath = path.join(changesPath, 'issues')
  if (!fs.existsSync(issuesPath)) {
    return { open: [], in_progress: [], review: [], done: [], blocked: [] }
  }

  const folders = {
    open: path.join(issuesPath, 'open'),
    in_progress: path.join(issuesPath, 'in_progress'),
    review: path.join(issuesPath, 'review'),
    done: path.join(issuesPath, 'done'),
    blocked: path.join(issuesPath, 'blocked'),
  }

  const result = {}
  for (const [name, folderPath] of Object.entries(folders)) {
    if (fs.existsSync(folderPath)) {
      result[name] = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'))
    } else {
      result[name] = []
    }
  }

  return result
}

function generateReport() {
  const { active, archived } = getChanges()

  let report = `# Relatório de Progresso — ${new Date().toISOString().split('T')[0]}\n\n`

  report += `**Total de changes:** ${active.length + archived.length} (${active.length} ativos + ${archived.length} arquivados)\n\n`

  report += `## Changes Ativos\n\n`
  for (const change of active) {
    const changePath = path.join(ROOT, 'openspec/changes', change)
    const issues = getIssues(changePath)

    report += `### ${change}\n\n`
    report += `- Issues abertas: ${issues.open.length}\n`
    report += `- Em progresso: ${issues.in_progress.length}\n`
    report += `- Em review: ${issues.review.length}\n`
    report += `- Concluídas: ${issues.done.length}\n`
    report += `- Bloqueadas: ${issues.blocked.length}\n\n`
  }

  report += `## Changes Arquivados\n\n`
  report += `| Change | Descrição |\n`
  report += `|--------|-----------|\n`
  for (const name of archived.slice(-10)) {
    report += `| ${name} |Arquivado |\n`
  }

  return report
}

const report = generateReport()
console.log(report)

const outputPath = path.join(ROOT, 'openspec/changes/PROGRESSO_AUTO.md')
fs.writeFileSync(outputPath, report)
console.log(`\nRelatório salvo em: ${outputPath}`)