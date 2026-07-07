#!/usr/bin/env node
/**
 * Script: add-data-testids.js
 *
 * Adiciona `data-testid` automaticamente nos componentes do PediAI
 * baseado em padrões de nomenclatura.
 *
 * **Uso:**
 * ```bash
 * # Modo dry-run (mostra o que mudaria)
 * node scripts/add-data-testids.js --dry-run
 *
 * # Aplica mudanças em arquivos específicos
 * node scripts/add-data-testids.js src/app/onboarding/page.tsx
 *
 * # Aplica em todo o diretório
 * node scripts/add-data-testids.js src/
 *
 * # Especifica prefixo customizado
 * node scripts/add-data-testids.js src/ --prefix pedi
 * ```
 *
 * **Regras de nomenclatura:**
 * - Botão com texto "Salvar" → `data-testid="save-button"`
 * - Input com name="email" → `data-testid="email-input"`
 * - Form → `data-testid="contact-form"`
 * - div com className="modal" → `data-testid="modal"`
 *
 * **Arquivos alterados:**
 * - Cria `<arquivo>.testids-backup.tsx` antes de modificar
 */

import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const PREFIX = (process.argv.find((arg) => arg.startsWith('--prefix=')) || '--prefix=pedi')
  .split('=')[1];

// Pega argumentos de arquivo (tudo que não é flag)
const targets = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'));

// Função recursiva pra listar arquivos .tsx/.jsx
function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist', '.git', 'coverage'].includes(entry.name)) {
        files.push(...walkFiles(fullPath));
      }
    } else if (/\.(tsx|jsx)$/.test(entry.name) && !entry.name.includes('.testids-backup.')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Gera testid baseado no nome/texto do elemento
function generateTestId(element, attrs) {
  // 1. Prioridade: name attribute
  if (attrs.name) {
    return `${attrs.name}-${element}`;
  }

  // 2. Texto interno (botões, labels)
  const text = extractText(element);
  if (text) {
    return `${slugify(text)}-${element}`;
  }

  // 3. ClassName (pega última classe significativa)
  if (attrs.className) {
    const classes = attrs.className.split(/\s+/);
    const meaningful = classes.find((c) => !/^(flex|grid|w-|h-|p-|m-|text-|bg-|border-|rounded-)/.test(c));
    if (meaningful) {
      return `${meaningful}-${element}`;
    }
  }

  // 4. ID
  if (attrs.id) {
    return `${attrs.id}-${element}`;
  }

  return null;
}

function extractText(element) {
  // Extrai texto de children (recursivo)
  const match = element.match(/>([^<>]{2,40})</);
  if (match) {
    return match[1].trim();
  }
  return null;
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Adiciona data-testid em elementos JSX que ainda não têm
function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const lines = content.split('\n');
  const updates = [];

  // Padrões de elementos que devem ter testid
  const patterns = [
    { tag: 'button', regex: /<button([^>]*?)>/g },
    { tag: 'input', regex: /<input([^>]*?)\/?>/g },
    { tag: 'select', regex: /<select([^>]*?)>/g },
    { tag: 'textarea', regex: /<textarea([^>]*?)>/g },
    { tag: 'form', regex: /<form([^>]*?)>/g },
    { tag: 'a', regex: /<a([^>]*?)>/g },
  ];

  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern.regex)];
    for (const match of matches) {
      const existingAttrs = match[1];

      // Skip se já tem data-testid
      if (/data-testid\s*=/.test(existingAttrs)) continue;

      // Extrai atributos existentes
      const attrs = extractAttributes(existingAttrs);

      // Gera testid
      const testId = generateTestId(pattern.tag, attrs);
      if (!testId) continue;

      const prefixedId = `${PREFIX}-${testId}`;

      // Adiciona data-testid
      const newAttrs = existingAttrs.trim()
        ? `${existingAttrs.trim()} data-testid="${prefixedId}"`
        : ` data-testid="${prefixedId}"`;

      const newTag = match[0].replace(
        existingAttrs,
        newAttrs
      );

      updates.push({
        original: match[0],
        replacement: newTag,
        testId: prefixedId,
      });
      modified = true;
    }
  }

  return { content, updates, modified };
}

function extractAttributes(attrString) {
  const attrs = {};
  // Regex pra pegar name="..." ou id='...'
  const nameMatch = attrString.match(/\bname\s*=\s*["']([^"']+)["']/);
  if (nameMatch) attrs.name = nameMatch[1];

  const idMatch = attrString.match(/\bid\s*=\s*["']([^"']+)["']/);
  if (idMatch) attrs.id = idMatch[1];

  const classMatch = attrString.match(/\bclassName\s*=\s*["']([^"']+)["']/);
  if (classMatch) attrs.className = classMatch[1];

  return attrs;
}

// ── Main ─────────────────────────────────────────────────

let files = [];
if (targets.length === 0) {
  // Default: processa src/
  files = walkFiles('./src');
} else {
  for (const target of targets) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      files.push(...walkFiles(target));
    } else if (stat.isFile()) {
      files.push(target);
    }
  }
}

let totalUpdates = 0;
let totalFiles = 0;

for (const file of files) {
  const { updates, modified } = patchFile(file);

  if (updates.length > 0) {
    totalFiles++;
    totalUpdates += updates.length;

    console.log(`\n📝 ${file} (${updates.length} updates)`);

    for (const update of updates.slice(0, 5)) {
      console.log(`  → ${update.testId}`);
      if (DRY_RUN) {
        console.log(`    - ${update.original.slice(0, 80)}...`);
        console.log(`    + ${update.replacement.slice(0, 80)}...`);
      }
    }

    if (updates.length > 5) {
      console.log(`  ... e mais ${updates.length - 5} updates`);
    }

    if (!DRY_RUN) {
      // Backup do original
      fs.copyFileSync(file, `${file}.testids-backup.tsx`);

      // Aplica mudanças
      let content = fs.readFileSync(file, 'utf8');
      // Aplica updates em ordem reversa (pra não bagunçar índices)
      for (let i = updates.length - 1; i >= 0; i--) {
        content = content.replace(updates[i].original, updates[i].replacement);
      }
      fs.writeFileSync(file, content);
    }
  }
}

console.log('\n' + '═'.repeat(70));
console.log(`Total: ${totalUpdates} updates em ${totalFiles} arquivos`);
if (DRY_RUN) console.log('(dry-run — nenhuma mudança foi aplicada)');
console.log('═'.repeat(70));

if (DRY_RUN) {
  console.log('\n💡 Para aplicar: rode sem --dry-run');
} else {
  console.log('\n✅ Mudanças aplicadas!');
  console.log('📦 Backups salvos como *.testids-backup.tsx');
  console.log('🧪 Rode os testes para verificar: pnpm test:e2e:smoke');
}