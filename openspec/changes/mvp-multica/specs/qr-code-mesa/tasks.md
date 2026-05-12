# Tasks: QR Code Mesa

## Specs

- [x] `specs/qr-code-mesa/spec.md` — RFC 2119 spec
- [x] `specs/qr-code-mesa/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Domain Service

#### 1.1 QRCodeCryptoService

- [x] Implementar `gerarAssinatura()`
- [x] Implementar `validarAssinatura()`
- [x] Usar HMAC-SHA256

**Arquivo:** `src/infrastructure/services/QRCodeCryptoService.ts`

---

### 2. API Endpoints

#### 2.1 GET /api/admin/mesas/[id]/qr

- [x] Implementado via TableQRCode component
- [x] Usa Google Charts API para gerar QR

**Arquivo:** `src/components/admin/TableQRCode.tsx`

#### 2.2 GET /api/mesas/validar

- [x] Implementado
- [x] Extrair params da query
- [x] Validar mesa existe e está ativa
- [x] Verificar expiração (24h)
- [x] Verificar assinatura HMAC
- [x] Retornar mesa e restaurante

**Arquivo:** `src/app/api/mesas/validar/route.ts`

---

### 3. Componentes Admin

#### 3.1 QRCodePreview

- [x] Implementado em TableQRCode.tsx
- [x] Preview do QR code
- [x] Botão de download
- [x] Copiar URL

**Arquivo:** `src/components/admin/TableQRCode.tsx`

#### 3.2 Integrar no admin de mesas

- [x] Adicionado na página de editar mesa

**Arquivo:** `src/app/admin/tables/[id]/page.tsx`

---

### 4. Utilitários

#### 4.1 QR Code Generation

- [x] Usa Google Charts API (api.qrserver.com)
- [x] Gera PNG
- [x] Tamanho adequado para impressão

---

### 5. Testes

#### 5.1 Unit Tests

- [x] Testes implementados em `tests/unit/infrastructure/services/QRCodeCryptoService.test.ts`
- [x] Testes de QRCodePayload em `tests/unit/domain/mesa/QRCodePayload.test.ts`
- [x] Testes de QRCodeValidationService em `tests/unit/domain/mesa/QRCodeValidationService.test.ts`

#### 5.2 E2E

- [x] Testes existentes em `tests/e2e/admin/table-qr.spec.ts`

---

### 6. Verificação

- [x] `npm run build` passa
- [x] `npm run lint` passa
- [x] QR code é gerado corretamente
- [x] Assinatura HMAC-SHA256 implementada

---

## Task Metadata

```yaml
sdd: qr-code-mesa
spec_file: specs/qr-code-mesa/spec.md
design_file: specs/qr-code-mesa/design.md
priority: low
blocking: false
```

---

## Dependencies

- Estrutura de mesas no banco (já existe)

---

## Progress

```
[ 14/14] tarefas completas
✅ Todas as tarefas implementadas
- Domain service: implementado
- Componentes admin: implementados
- Testes unitários: implementados
- API de validação: implementado
```
