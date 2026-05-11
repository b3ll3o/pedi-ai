# Spec: QR Code Mesa — MVP Multica

## 1. Overview

**Bounded Context:** mesa
**Scope:** Sistema de QR code para identificar mesa do restaurante
**Status:** draft

---

## 2. Definições

| Termo | Definição |
|-------|-----------|
| **QR Code** | Código que redireciona para cardápio da mesa |
| **Payload** | Dados codificados no QR (restauranteId, mesaId, timestamp, signature) |
| **Signature** | Assinatura HMAC-SHA256 para validação |

---

## 3. Sistema de QR Code

### 3.1 Payload do QR Code

```typescript
interface QRCodePayload {
  restauranteId: string;
  mesaId: string;
  timestamp: number;
  signature: string;
}
```

### 3.2 Geração (Admin)

| Step | Ação |
|------|------|
| 1 | Gerar payload JSON |
| 2 | Criar string para assinar |
| 3 | Assinar com HMAC-SHA256 (segredo do restaurante) |
| 4 | Gerar QR code com URL final |

### 3.3 URL Final

```
https://app.exemplo.com/r/{slug}?mesaId={mesaId}&t={timestamp}&s={signature}
```

### 3.4 Validação (Cliente)

| Step | Ação |
|------|------|
| 1 | Extrair mesaId, timestamp, signature da URL |
| 2 | Buscar segredo do restaurante |
| 3 | Recalcular assinatura |
| 4 | Comparar assinaturas |
| 5 | Verificar timestamp (máx 24h) |
| 6 | Retornar mesa se válido |

---

## 4. FSM de Mesa

```
┌────────┐    criar    ┌─────────┐
│ (new)  │ ─────────▶ │  ativa  │
└────────┘            └────┬────┘
                           │
              desativar ▼   ▼ ativar
                       ┌────────┐
                       │inativa │
                       └────────┘
```

---

## 5. API Endpoints

### POST /api/admin/mesas/[id]/qr

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "url": "https://app.exemplo.com/r/restaurante-x?mesaId=..."
}
```

### GET /api/mesas/validar

**Query:** `?mesaId=X&timestamp=Y&signature=Z`

**Response:**
```json
{
  "valida": true,
  "mesa": {
    "id": "uuid",
    "numero": "5",
    "capacidade": 4
  },
  "restaurante": {
    "id": "uuid",
    "nome": "Restaurante X",
    "slug": "restaurante-x"
  }
}
```

---

## 6. Critérios de Aceitação

- [ ] Admin consegue gerar QR code para mesa
- [ ] QR code contém assinatura HMAC-SHA256
- [ ] URL do QR redireciona para `/r/[slug]`
- [ ] Mesa é validada corretamente
- [ ] QR expirado (>24h) é rejeitado
- [ ] Assinatura inválida é rejeitada
- [ ] Mesa desativada não é acessível via QR

---

## 7. Out of Scope

- QR code dinâmico (que muda em intervalos)
- Redirecionamento para múltiplos idiomas
- Analytics de scan
