# Tasks: QR Code Mesa

## Specs

- [x] `specs/qr-code-mesa/spec.md` — RFC 2119 spec
- [x] `specs/qr-code-mesa/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Domain Service

#### 1.1 QRCodeCryptoService

- [ ] Implementar `generateSignature()`
- [ ] Implementar `verifySignature()`
- [ ] Implementar `isExpired()`
- [ ] Usar timing-safe comparison

**Arquivo:** `src/domain/mesa/services/QRCodeCryptoService.ts`

---

### 2. API Endpoints

#### 2.1 GET /api/admin/mesas/[id]/qr

- [ ] Buscar mesa e restaurante
- [ ] Gerar payload com timestamp
- [ ] Assinar com HMAC-SHA256
- [ ] Gerar QR code (qrcode library)
- [ ] Retornar imagem base64 e URL

**Arquivo:** `src/app/api/admin/mesas/[id]/qr/route.ts`

#### 2.2 GET /api/mesas/validar

- [ ] Extrair params da query
- [ ] Validar mesa existe e está ativa
- [ ] Verificar expiração (24h)
- [ ] Verificar assinatura HMAC
- [ ] Retornar mesa e restaurante

**Arquivo:** `src/app/api/mesas/validar/route.ts`

---

### 3. Componentes Admin

#### 3.1 QRCodePreview

- [ ] Exibir preview do QR code
- [ ] Botão de download
- [ ] Copiar URL

**Arquivo:** `src/components/admin/mesa/QRCodePreview.tsx`

#### 3.2 Integrar no admin de mesas

- [ ] Adicionar QRCodePreview na página de editar mesa
- [ ] Botão "Gerar QR Code"

**Arquivo:** `src/app/admin/tables/[id]/page.tsx`

---

### 4. Utilitários

#### 4.1 QR Code Generation

- [ ] Usar library `qrcode`
- [ ] Gerar PNG base64
- [ ] Tamanho adequado para impressão

---

### 5. Testes

#### 5.1 Unit Tests

- [ ] Testar `generateSignature`
- [ ] Testar `verifySignature` (válido)
- [ ] Testar `verifySignature` (inválido)
- [ ] Testar `isExpired`

**Arquivo:** `tests/unit/domain/mesa/services/QRCodeCryptoService.test.ts`

#### 5.2 E2E

- [ ] `tests/e2e/admin/generate-qr.spec.ts`
  - Admin gera QR code
  - QR code é válido

- [ ] `tests/e2e/customer/scan-qr.spec.ts`
  - Cliente escaneia QR
  - Redireciona para cardápio correto

---

### 6. Verificação

- [ ] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] QR code é gerado corretamente
- [ ] Validação funciona
- [ ] Assinatura inválida é rejeitada

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
[  0/14] tarefas completas
```
