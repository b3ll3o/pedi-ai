# BDD — Behavior-Driven Development

> **Status:** Estrutura inicial — **PoC não integradas ao runner ainda**
> Veja [`.openspec/AGENTS.md`](../../../../.openspec/AGENTS.md) §7 para RTM.

Esta pasta contém **especificações executáveis** em formato Gherkin (`.feature`)
para cada Bounded Context. Cada arquivo referencia os `RF-<CTX>-NN` declarados
em [`.openspec/specs/`](../../../../.openspec/specs/).

---

## Estrutura

```
apps/web/tests/bdd/
├── README.md                       # Este arquivo
├── steps/                          # Steps em pt-BR (a criar quando integrar runner)
│   └── ...
└── features/
    ├── autenticacao/
    │   └── autenticacao.feature
    ├── admin/
    │   └── admin-restaurante.feature
    ├── cardapio/
    │   └── cardapio-navegacao.feature
    ├── mesa/
    │   └── mesa-qr-code.feature
    ├── pedido/
    │   └── pedido-completo.feature
    └── pagamento/
        └── pagamento-pix.feature
```

---

## Como rodar (quando integrado)

```bash
# 1. Instalar runner (Playwright BDD é a recomendação)
pnpm add -D playwright-bdd @cucumber/cucumber

# 2. Configurar vitest.config.ts (ou playwright.config.ts) para descobrir .feature
# 3. Mapear steps para funções TypeScript
pnpm test:bdd
```

**Recomendação**: usar [`playwright-bdd`](https://github.com/vitalets/playwright-bdd)
para reaproveitar os Page Objects já existentes em `apps/web/tests/e2e/pages/`.

---

## Convenção de Linguagem

- **pt-BR** em todos os steps (Dado/Quando/Então/ E).
- Tags `@RF-XXX-NN` para vincular a requisitos formais.
- Tags `@smoke`, `@critical`, `@slow` (alinhadas com E2E).

Exemplo:

```gherkin
# language: pt
Funcionalidade: Autenticação de cliente
  Como um cliente do restaurante
  Eu quero me autenticar com e-mail e senha
  Para poder fazer pedidos

  @RF-AUTH-02 @smoke @critical
  Cenário: Login com credenciais válidas
    Dado que estou na página de login
    Quando eu preencho "email@example.com" e "senha123"
    E clico em "Entrar"
    Então devo ser redirecionado para "/cardapio"
    E devo ver "Olá, usuário"
```

---

## Status por BC

| BC             | Feature                                   | Status          |
| -------------- | ----------------------------------------- | --------------- |
| `autenticacao` | `autenticacao.feature` (3 cenários)       | ✅ Spec escrita |
| `admin`        | `admin-restaurante.feature` (2 cenários)  | ✅ Spec escrita |
| `cardapio`     | `cardapio-navegacao.feature` (2 cenários) | ✅ Spec escrita |
| `mesa`         | `mesa-qr-code.feature` (2 cenários)       | ✅ Spec escrita |
| `pedido`       | `pedido-completo.feature` (2 cenários)    | ✅ Spec escrita |
| `pagamento`    | `pagamento-pix.feature` (2 cenários)      | ✅ Spec escrita |

**Próximo passo (a coordenar com Time Plataforma)**: integrar `playwright-bdd`
e mapear os steps para os Page Objects existentes.
