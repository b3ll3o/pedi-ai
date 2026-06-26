#!/usr/bin/env node
/**
 * S3#11: mede tamanho dos chunks JS gerados pelo Next build.
 *
 * Usage:
 *   node scripts/bundle-size.mjs          # lê .next/static/chunks
 *
 * Saída: lista dos 20 maiores arquivos .js + total geral, em KB/MB.
 * Roda após `next build`. Salva em `.next/bundle-baseline.json` para
 * comparar com builds futuros.
 */
import fs from 'node:fs';
import path from 'node:path';

const CHUNKS_DIR = path.resolve('.next/static/chunks');
const BASELINE_PATH = path.resolve('.next/bundle-baseline.json');

function collectJsFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Diretório não encontrado: ${dir}`);
    console.error('Rode `pnpm --filter @pedi-ai/web build` antes.');
    process.exit(1);
  }
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (entry.name.endsWith('.js')) {
      const stat = fs.statSync(full);
      out.push({ path: path.relative(CHUNKS_DIR, full), size: stat.size });
    }
  }
  return out;
}

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main() {
  const files = collectJsFiles(CHUNKS_DIR);
  files.sort((a, b) => b.size - a.size);

  const total = files.reduce((acc, f) => acc + f.size, 0);
  const top = files.slice(0, 20);

  console.log(`Total de arquivos .js: ${files.length}`);
  console.log(`Tamanho total: ${fmtKb(total)} (${(total / 1024 / 1024).toFixed(2)} MB)\n`);
  console.log('Top 20 maiores chunks:');
  console.log('─'.repeat(70));
  for (const f of top) {
    console.log(`${fmtKb(f.size).padStart(10)}  ${f.path}`);
  }

  // Salva baseline para diff futuro.
  fs.writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalBytes: total,
        topFiles: top,
      },
      null,
      2
    )
  );
  console.log(`\nBaseline salvo em ${BASELINE_PATH}`);
}

main();
