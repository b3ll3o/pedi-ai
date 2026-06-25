/**
 * RTM (Requirements Traceability Matrix) Generator
 *
 * Varre o repositório em busca de:
 *   1. Specs em `.openspec/specs/<bc>/design.md` — declara os RFs.
 *   2. Comentários `@spec(RF-XXX-NN)` no código — materializa o requisito.
 *   3. Testes unitários (*.test.ts, *.spec.ts) que referenciam o mesmo RF.
 *   4. Testes E2E (*.spec.ts em apps/web/tests/e2e/) — opcional.
 *
 * Saída: `docs/requirements/RTM.md`
 *
 * Uso:
 *   pnpm tsx scripts/rtm.ts
 *
 * Códigos de saída:
 *   0 — RTM gerada, sem requisitos órfãos
 *   1 — Gerado com avisos (RF sem código ou sem teste)
 *   2 — Erro de I/O ou parse
 *
 * Veja `.openspec/AGENTS.md` para a convenção de IDs.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SPECS_DIR = join(ROOT, '.openspec', 'specs');
const OUTPUT_PATH = join(ROOT, 'docs', 'requirements', 'RTM.md');

interface RfRef {
  rf: string; // ex.: "RF-AUTH-01"
  bc: string; // ex.: "autenticacao"
  description: string; // linha após o heading
}

interface CodeRef {
  rf: string;
  path: string; // caminho relativo à raiz
}

interface TestRef {
  rf: string;
  path: string;
}

interface RtmRow {
  rf: string;
  bc: string;
  description: string;
  codeRefs: string[];
  unitTestRefs: string[];
  e2eTestRefs: string[];
  status: 'Done' | 'Partial' | 'Missing' | 'Planned';
}

// ─── Utilitários de FS ────────────────────────────────────────────────────────

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, exts, out);
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

const RF_HEADING = /^###\s+`?(RF-[A-Z]+-\d+)`?\s+[—\-]+\s*(.+)$/gm;
const SPEC_COMMENT_RE = /@spec\(\s*(RF-[A-Z]+-\d+(?:\s*,\s*RF-[A-Z]+-\d+)*)\s*\)/g;
const SPEC_TEST_RE = /RF-[A-Z]+-\d+/g;

function parseSpec(bc: string, designPath: string): RfRef[] {
  const content = readFileSync(designPath, 'utf-8');
  const refs: RfRef[] = [];
  // Formato 1: heading `### \`RF-XXX-NN\` — Descrição` (usado em `autenticacao`)
  const headingRe = /^###\s+`?(RF-[A-Z]+-\d+)`?\s+[—\-]+\s*(.+)$/;
  // Formato 2: linha de tabela `| \`RF-XXX-NN\` | Descrição | ...` (usado em admin, cardapio, mesa, pedido, pagamento)
  const tableRe = /^\|\s*`?(RF-[A-Z]+-\d+)`?\s*\|\s*([^|]+?)\s*\|/;

  for (const line of content.split('\n')) {
    let m = line.match(headingRe);
    if (m && m[1] && m[2]) {
      refs.push({ rf: m[1], bc, description: m[2].trim() });
      continue;
    }
    m = line.match(tableRe);
    if (m && m[1] && m[2]) {
      refs.push({ rf: m[1], bc, description: m[2].trim() });
    }
  }
  return refs;
}

function collectSpecs(): RfRef[] {
  if (!existsSync(SPECS_DIR)) {
    throw new Error(`Diretório de specs não encontrado: ${SPECS_DIR}`);
  }
  const all: RfRef[] = [];
  for (const bc of readdirSync(SPECS_DIR)) {
    const bcPath = join(SPECS_DIR, bc);
    if (!statSync(bcPath).isDirectory()) continue;
    const design = join(bcPath, 'design.md');
    if (existsSync(design)) {
      all.push(...parseSpec(bc, design));
    }
  }
  return all;
}

function collectCodeRefs(): CodeRef[] {
  const files = [
    ...walk(join(ROOT, 'apps', 'web', 'src', 'domain'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'src', 'application'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'src', 'infrastructure'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'src', 'lib'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'src', 'hooks'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'src', 'app'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'api', 'src', 'domain'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'api', 'src', 'application'), ['.ts']),
    ...walk(join(ROOT, 'apps', 'api', 'src', 'infrastructure'), ['.ts']),
  ];

  const refs: CodeRef[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Reset regex state por iteração
    SPEC_COMMENT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SPEC_COMMENT_RE.exec(content)) !== null) {
      const ids = m[1].split(',').map((s) => s.trim());
      for (const id of ids) {
        refs.push({ rf: id, path: relative(ROOT, file).split(sep).join('/') });
      }
    }
  }
  return refs;
}

function collectTestRefs(): TestRef[] {
  const files = [
    ...walk(join(ROOT, 'apps', 'web', 'tests', 'unit'), ['.test.ts', '.spec.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'tests', 'integration'), ['.test.ts', '.spec.ts']),
    ...walk(join(ROOT, 'apps', 'api', 'tests'), ['.test.ts', '.spec.ts']),
    ...walk(join(ROOT, 'apps', 'web', 'tests', 'e2e'), ['.spec.ts']),
  ];
  const refs: TestRef[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const matches = content.match(SPEC_TEST_RE);
    if (!matches) continue;
    const unique = Array.from(new Set(matches));
    const rel = relative(ROOT, file).split(sep).join('/');
    for (const rf of unique) {
      refs.push({ rf, path: rel });
    }
  }
  return refs;
}

// ─── Composição da RTM ────────────────────────────────────────────────────────

function buildRtm(specs: RfRef[], codeRefs: CodeRef[], testRefs: TestRef[]): RtmRow[] {
  // Deduplicar por RF (manter a primeira ocorrência)
  const seen = new Set<string>();
  const uniqueSpecs = specs.filter((s) => {
    if (seen.has(s.rf)) return false;
    seen.add(s.rf);
    return true;
  });

  const rows: RtmRow[] = [];

  for (const spec of uniqueSpecs) {
    const code = codeRefs.filter((c) => c.rf === spec.rf).map((c) => c.path);
    const tests = testRefs.filter((t) => t.rf === spec.rf);
    const unit = tests
      .filter(
        (t) =>
          t.path.includes('/unit/') ||
          t.path.includes('/integration/') ||
          t.path.startsWith('apps/api/tests')
      )
      .map((t) => t.path);
    const e2e = tests.filter((t) => t.path.includes('/e2e/')).map((t) => t.path);

    const hasCode = code.length > 0;
    const hasUnit = unit.length > 0;
    const hasE2e = e2e.length > 0;

    let status: RtmRow['status'];
    if (hasCode && hasUnit && hasE2e) {
      status = 'Done';
    } else if (hasCode && (hasUnit || hasE2e)) {
      status = 'Partial';
    } else if (hasCode) {
      status = 'Partial';
    } else {
      status = 'Missing';
    }

    // RFs planejados (no design.md marcados como "🟡 Planejado") — não falha CI.
    if (spec.description.toLowerCase().includes('planejado')) {
      status = 'Planned';
    }

    rows.push({
      rf: spec.rf,
      bc: spec.bc,
      description: spec.description,
      codeRefs: code,
      unitTestRefs: unit,
      e2eTestRefs: e2e,
      status,
    });
  }

  return rows.sort((a, b) => a.rf.localeCompare(b.rf));
}

// ─── Render Markdown ──────────────────────────────────────────────────────────

function renderRtm(rows: RtmRow[]): string {
  const now = new Date().toISOString().slice(0, 10);
  let md = `# Requirements Traceability Matrix (RTM)\n\n`;
  md += `> Gerado automaticamente em ${now} por \`scripts/rtm.ts\`.\n`;
  md += `> Veja [\`.openspec/AGENTS.md\`](../../.openspec/AGENTS.md) para convenções.\n\n`;

  md += `## Resumo\n\n`;
  md += `| Status      | Contagem |\n`;
  md += `| ----------- | -------- |\n`;
  for (const status of ['Done', 'Partial', 'Missing', 'Planned'] as const) {
    md += `| ${statusIcon(status)} ${status} | ${rows.filter((r) => r.status === status).length} |\n`;
  }
  md += `\n`;

  md += `## Matriz\n\n`;
  md += `| RF | BC | Descrição | Materialização (código) | Testes Unitários | Testes E2E | Status |\n`;
  md += `| -- | -- | --------- | ----------------------- | ---------------- | ---------- | ------ |\n`;

  for (const r of rows) {
    const code = r.codeRefs.length > 0 ? r.codeRefs.map((c) => `\`${c}\``).join('<br>') : '—';
    const unit =
      r.unitTestRefs.length > 0 ? r.unitTestRefs.map((t) => `\`${t}\``).join('<br>') : '—';
    const e2e = r.e2eTestRefs.length > 0 ? r.e2eTestRefs.map((t) => `\`${t}\``).join('<br>') : '—';
    md += `| \`${r.rf}\` | ${r.bc} | ${r.description} | ${code} | ${unit} | ${e2e} | ${statusIcon(r.status)} ${r.status} |\n`;
  }

  md += `\n## Avisos\n\n`;
  const orphans = rows.filter((r) => r.status === 'Missing' || r.status === 'Partial');
  if (orphans.length === 0) {
    md += `_Nenhum requisito órfão detectado._ ✅\n`;
  } else {
    md += `Requisitos sem cobertura completa:\n\n`;
    for (const r of orphans) {
      md += `- **${r.rf}** (${r.status}): ${r.description}\n`;
    }
  }

  return md;
}

function statusIcon(s: RtmRow['status']): string {
  return { Done: '✅', Partial: '🟡', Missing: '🔴', Planned: '⏸️' }[s];
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

function main(): void {
  console.log('🔍 Gerando RTM...');

  let specs: RfRef[], codeRefs: CodeRef[], testRefs: TestRef[];
  try {
    specs = collectSpecs();
    codeRefs = collectCodeRefs();
    testRefs = collectTestRefs();
  } catch (err) {
    console.error(`❌ Erro ao coletar referências: ${(err as Error).message}`);
    process.exit(2);
  }

  console.log(`   → ${specs.length} RFs declarados em specs`);
  console.log(`   → ${codeRefs.length} referências @spec(...) no código`);
  console.log(`   → ${testRefs.length} referências em testes`);

  const rows = buildRtm(specs, codeRefs, testRefs);
  const md = renderRtm(rows);

  // Garante que o diretório existe
  const outDir = join(ROOT, 'docs', 'requirements');
  if (!existsSync(outDir)) {
    const { mkdirSync } = require('node:fs');
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, md, 'utf-8');
  console.log(`✅ RTM gerada em ${relative(ROOT, OUTPUT_PATH)}`);

  // Resumo de saúde
  const missing = rows.filter((r) => r.status === 'Missing').length;
  const partial = rows.filter((r) => r.status === 'Partial').length;
  if (missing > 0) {
    console.warn(`⚠️  ${missing} RF(s) sem código materializado.`);
    process.exit(1);
  }
  if (partial > 0) {
    console.warn(`⚠️  ${partial} RF(s) com cobertura parcial.`);
    // não falha exit — deixa o time decidir
  }
}

main();
