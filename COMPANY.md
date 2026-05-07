# Pedi-AI - Cardapio Digital para Restaurantes

## Empresa

```yaml
name: Pedi-AI
legal_name: Pedi-AI Tecnologia Ltda
cnpj: 00.000.000/0001-00
founded: 2024
status: active

address:
  street: [A DEFINIR]
  city: Brasil
  state: SP
  country: Brasil

contact:
  email: contato@pedi-ai.com
  phone: [A DEFINIR]
```

##missao

Tornar o atendimento em restaurantes mais eficiente através de cardapios digitais inteligentes que funcionam offline, permitindo que clientes façam pedidos sem depender de conexao internet.

## Visao

Ser a principal plataforma de cardapio digital para restaurantes no Brasil, com forte presenca em Sao Paulo e expansao nacional.

## Valores

- **Inovacao**: Sempre buscando solucoes criativas
- **Simplicidade**: Interface intuitiva e facil uso
- **Confiabilidade**: Sistema estavel e sempre disponivel
- **Off-line First**: Funciona mesmo sem internet

## Produto

### Cardapio Digital
- QR Code por mesa
- Cardapio interativo com fotos
- Sistema de pedidos
- Pagamento na mesa
- Funciona 100% offline

### Diferenciais
- PWA instalavel
- Sincronizacao automatica quando online
- Atualizacao de cardapio em tempo real
- Relatorios de pedidos

## Tech Stack

```yaml
frontend:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript (strict)
  - TailwindCSS
  - Zustand
  - Workbox (Service Worker)
  - IndexedDB (Dexie)

backend:
  - Next.js API Routes
  - Supabase (PostgreSQL + Auth + Storage)
  - Prisma ORM

infrastructure:
  - Vercel (deploy)
  - GitHub Actions (CI/CD)
  - Sentry (error tracking)

testing:
  - Vitest (unit + integration)
  - Playwright (E2E)
```

## Arquitetura DDD

```yaml
bounded_contexts:
  - admin: Gestao do restaurante
  - autenticacao: Usuarios e sessoes
  - cardapio: Produtos e categorias
  - mesa: Mesas e QR codes
  - pagamento: Processamento de pagamentos
  - pedido: Pedidos e itens
  - shared: Compartilhado
```

## Mercado

- **Target**: Restaurantes em Sao Paulo
- **Modelo**: B2B2C (restaurante -> consumidor)
- **Preco**: [A DEFINIR - ex: R$99/mês por restaurante]

## Modelo de Receita

```yaml
plans:
  basic:
    name: Basico
    price: R$99/mês
    features:
      - Cardapio digital
      - ate 50 produtos
      - 5 mesas
      - QR codes

  professional:
    name: Profissional
    price: R$199/mês
    features:
      - Tudo do Basico
      - Produtos ilimitados
      - Mesas ilimitadas
      - Pagamento na mesa
      - Relatorios basicos

  enterprise:
    name: Empresarial
    price: R$499/mês
    features:
      - Tudo do Profissional
      - Multi-franquias
      - Relatorios avancados
      - API de integracao
      - Suporte prioritario
```

## Metas 2026

```yaml
q1:
  - Lancar MVP
  - 10 restaurantespiloto
  - MRR: R$10.000

q2:
  - 50 restaurantes
  - MRR: R$50.000

q3:
  - 150 restaurantes
  - MRR: R$150.000

q4:
  - 500 restaurantes
  - MRR: R$500.000
```

## Budget Total

```yaml
total_monthly_budget: $600

allocation:
  ceo: $50
  cto: $150
  dev_backend: $100
  dev_frontend: $100
  cmo: $80
  social_agent: $40
  cfo: $30
  budget_monitor: $20
  infrastructure: $30
```

## Cronograma

```yaml
fiscal_year: Jan-Dec
board_meetings: monthly
sprint_duration: 2 weeks
deployment_frequency: weekly
```

## Compliance

```yaml
brazilian_laws:
  lgpd: true
  codigo_defesa_consumidor: true

data_residency: Brazil (AWS sa-east-1)
backup_frequency: daily
backup_retention_days: 30
```
