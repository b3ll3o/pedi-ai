#!/usr/bin/env node

/**
 * Auditor de Documentação
 *
 * Verifica consistência entre specs, docs e implementação.
 *
 * Uso: node scripts/audit-docs.js
 */

const fs = await import('fs');
const path = await import('path');

const ROOT = path.join(__dirname, '..');

const results = {
  specsWithoutImpl: [],
  docsWithoutSpec: [],
  outdatedSpecs: [],
  brokenLinks: [],
  missingCodemaps: [],
};

function _walk(dir, extensions = ['.md']) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...walk(fullPath));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkSpecs() {
  const specsDir = path.join(ROOT, 'openspec/specs');
  const domains = fs.readdirSync(specsDir);

  // Mapeamento de spec names para domain names
  const specToDomainMap = {
    'admin': 'admin',
    'auth': 'autenticacao',
    'cart': 'pedido', // cart é parte de pedido
    'menu': 'cardapio',
    'order': 'pedido',
    'payment': 'pagamento',
    'table': 'mesa',
    'offline': null, // não é um domínio
    'landing': null, // não é um domínio
    'seo': null, // não é um domínio
    'combos': 'cardapio', // combos faz parte de cardapio
    'modifier-groups': 'cardapio',
    'register': 'autenticacao',
    'design-system': null, // não é um domínio
  };

  const implDirs = [
    'src/domain',
    'src/application',
  ];

  console.log('\n📋 Verificando Specs...\n');

  for (const domain of domains) {
    const specPath = path.join(specsDir, domain, 'spec.md');
    const hasSpec = fs.existsSync(specPath);

    // Skip non-domain specs
    if (specToDomainMap[domain] === null) {
      console.log(`ℹ️  ${domain}: spec de feature (não domínio) - ignorado`);
      continue;
    }

    const domainName = specToDomainMap[domain] || domain;
    const domainImpl = implDirs.some(dir => {
      const domainPath = path.join(ROOT, dir, domainName);
      return fs.existsSync(domainPath);
    });

    if (!hasSpec && domainImpl) {
      results.specsWithoutImpl.push(domain);
      console.log(`❌ Spec missing: ${domain} (impl: ${domainName})`);
    } else if (hasSpec && domainImpl) {
      console.log(`✅ ${domain}: spec + impl (${domainName})`);
    } else if (hasSpec && !domainImpl) {
      console.log(`⚠️  ${domain}: spec sem impl em ${domainName}`);
    }
  }
}

function checkCodemaps() {
  console.log('\n🗺️ Verificando Codemaps...\n');

  const requiredCodemaps = [
    'codemap.md',
    'src/app/codemap.md',
  ];

  for (const codemap of requiredCodemaps) {
    const fullPath = path.join(ROOT, codemap);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${codemap}`);
    } else {
      results.missingCodemaps.push(codemap);
      console.log(`❌ ${codemap} missing`);
    }
  }

  // Check domain codemaps
  const domainDir = path.join(ROOT, 'src/domain');
  if (fs.existsSync(domainDir)) {
    const domains = fs.readdirSync(domainDir);
    for (const domain of domains) {
      const codemapPath = path.join(domainDir, domain, 'codemap.md');
      if (fs.existsSync(codemapPath)) {
        console.log(`✅ domain/${domain}/codemap.md`);
      } else {
        console.log(`⚠️  domain/${domain}/codemap.md missing`);
      }
    }
  }
}

function checkDocs() {
  console.log('\n📚 Verificando Docs...\n');

  const docsIndex = path.join(ROOT, 'docs/INDICE.md');
  if (!fs.existsSync(docsIndex)) {
    console.log('❌ docs/INDICE.md missing');
    return;
  }

  const indexContent = fs.readFileSync(docsIndex, 'utf-8');
  const guideLinks = indexContent.match(/\.\/guides\/[^\.]+\.md/g) || [];

  for (const link of guideLinks) {
    const fullPath = path.join(ROOT, 'docs', link);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${link}`);
    } else {
      console.log(`❌ ${link} (broken)`);
    }
  }
}

function checkOutdatedContent() {
  console.log('\n⚠️ Verificando conteúdo desatualizado...\n');

  // Check for Mercado Pago references in payment spec
  const paymentSpec = path.join(ROOT, 'openspec/specs/payment/spec.md');
  if (fs.existsSync(paymentSpec)) {
    const content = fs.readFileSync(paymentSpec, 'utf-8');
    if (content.includes('MercadoPago') || content.includes('mercadopago')) {
      results.outdatedSpecs.push('payment (ainda menciona Mercado Pago)');
      console.log('❌ Payment spec menciona Mercado Pago (desatualizado)');
    } else {
      console.log('✅ Payment spec OK');
    }
  }

  // Check AGENTS.md vs actual DDD status
  const agentsPath = path.join(ROOT, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const content = fs.readFileSync(agentsPath, 'utf-8');

    // Extract DDD status from AGENTS.md
    const dddStatusMatch = content.match(/\*\*STATUS\*\*:.*?([✅🔄📋])/s);
    if (dddStatusMatch) {
      console.log(`ℹ️  AGENTS.md diz DDD: ${dddStatusMatch[1]}`);
    }
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 RELATÓRIO DE AUDITORIA');
  console.log('='.repeat(50));

  const total = [
    ...results.specsWithoutImpl,
    ...results.docsWithoutSpec,
    ...results.outdatedSpecs,
    ...results.brokenLinks,
    ...results.missingCodemaps,
  ].length;

  if (total === 0) {
    console.log('\n✅ Tudo OK! Nenhum problema encontrado.\n');
  } else {
    console.log(`\n❌ ${total} problema(s) encontrado(s):\n`);

    if (results.outdatedSpecs.length) {
      console.log('📝 Specs desatualizados:');
      results.outdatedSpecs.forEach(s => console.log(`  - ${s}`));
    }

    if (results.missingCodemaps.length) {
      console.log('\n🗺️  Codemaps faltando:');
      results.missingCodemaps.forEach(c => console.log(`  - ${c}`));
    }

    if (results.specsWithoutImpl.length) {
      console.log('\n📋 Specs sem implementação:');
      results.specsWithoutImpl.forEach(s => console.log(`  - ${s}`));
    }
  }

  console.log('\n' + '='.repeat(50));
  return total;
}

// Main
console.log('🔍 Iniciando auditoria de documentação...\n');

try {
  checkSpecs();
  checkCodemaps();
  checkDocs();
  checkOutdatedContent();
  const issues = generateReport();
  process.exit(issues > 0 ? 1 : 0);
} catch (error) {
  console.error('❌ Erro durante auditoria:', error.message);
  process.exit(1);
}
