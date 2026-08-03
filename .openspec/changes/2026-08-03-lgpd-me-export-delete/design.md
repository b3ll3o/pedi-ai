# Design — LGPD `/users/me/export` + `DELETE /users/me`

## 1. Endpoints

### `GET /users/me/export`

**Auth:** JWT obrigatório (qualquer role).
**Rate limit:** sem limite extra (já herda `long` tier = 300/min).
**Resposta 200:**

```json
{
  "exportedAt": "2026-08-03T12:00:00.000Z",
  "subject": {
    "id": "uuid",
    "role": "cliente",
    "restaurantId": "uuid|null",
    "name": "João",
    "email": "joao@exemplo.com",
    "createdAt": "..."
  },
  "orders": [
    { "id": "...", "status": "...", "totalPrice": 50.0, "createdAt": "...", "items": [...] }
  ],
  "paymentIntents": [
    { "id": "...", "status": "paid", "amount": 50.0, "createdAt": "...", "expiresAt": "..." }
  ],
  "refreshTokens": [
    { "id": "...", "createdAt": "...", "expiresAt": "...", "revokedAt": null, "revokedReason": null }
  ],
  "passwordResetTokens": [
    { "id": "...", "createdAt": "...", "expiresAt": "...", "used": false }
  ],
  "subscriptions": [
    { "id": "...", "status": "...", "planType": "...", "createdAt": "..." }
  ]
}
```

**Resposta 401:** sem JWT.
**Resposta 404:** user não existe (improvável com JWT válido, mas defensivo).

### `DELETE /users/me`

**Auth:** JWT obrigatório.
**Rate limit:** 3/hora por IP (sobrepõe `long` tier).

**Comportamento (transacional):**

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Verifica que perfil existe (404 se não)
  const profile = await tx.usersProfile.findUnique({ where: { id: userId } });
  if (!profile) throw new NotFoundException();

  // 2. Anonimiza perfil
  await tx.usersProfile.update({
    where: { id: userId },
    data: {
      email: `anon-${userId}@deleted.local`,
      name: 'Usuário Removido',
      passwordHash: null,
      userId: null, // desvincula conta auth
    },
  });

  // 3. Revoga refresh tokens
  await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: 'lgpd_self_deletion' },
  });

  // 4. Invalida password reset tokens em aberto
  await tx.passwordResetToken.updateMany({
    where: { userId, used: false, expiresAt: { gt: new Date() } },
    data: { used: true, expiresAt: new Date() },
  });
});
```

**Resposta 200:**

```json
{
  "success": true,
  "anonymizedAt": "2026-08-03T12:00:00.000Z",
  "preservedForFiscalAudit": ["orders", "paymentIntents", "subscriptions"]
}
```

**Idempotência:** segunda chamada detecta email já anonimizado
(`email.startsWith('anon-')`) e retorna 200 com `alreadyAnonymized: true`,
sem efeito colateral.

## 2. Requisitos Funcionais (RF)

| ID           | Descrição                                       | Status     |
| ------------ | ----------------------------------------------- | ---------- |
| `RF-AUTH-12` | Exportar todos os dados pessoais do titular     | ✅ Esta PR |
| `RF-AUTH-13` | Eliminar (anonimizar) dados pessoais do titular | ✅ Esta PR |

## 3. Requisitos Não-Funcionais (RNF)

| ID            | Descrição                                     | Status        |
| ------------- | --------------------------------------------- | ------------- |
| `RNF-LGPD-01` | Anonimização em ≤15 dias (art. 18, §5º)       | ✅ Síncrono   |
| `RNF-LGPD-02` | Retenção fiscal de Orders/Payments por 5 anos | ✅ Não-deleta |
| `RNF-LGPD-03` | Export em formato estruturado (JSON)          | ✅ Esta PR    |
| `RNF-PERF-04` | P95 export < 500ms                            | 🟡 Medir      |

## 4. Diagrama de sequência — DELETE /users/me

```
Cliente ──HTTP DELETE──> UsersController.deleteMe
                              ↓
                         JWT Strategy (valida)
                              ↓
                         UsersService.anonymizeOwnAccount(userId)
                              ↓
                         prisma.$transaction (Serializable)
                           ├─ findUnique UsersProfile
                           ├─ update UsersProfile (email/nome/hash)
                           ├─ updateMany RefreshToken (revokedAt)
                           └─ updateMany PasswordResetToken (used)
                              ↓
Cliente <──200 OK────── { success, anonymizedAt, preservedForFiscalAudit }
```

## 5. Decisões de Design

### 5.1 Por que anonimização em vez de hard delete?

LGPD art. 18, VI fala em "eliminação de dados desnecessários, excessivos ou
tratados em desconformidade". Mas:

- Orders têm **obrigação fiscal** (Receita Federal, art. 27 LGPD) — retenção 5 anos.
- `PaymentIntent` vincula transação PIX ao userId — auditoria do BACEN/PSP.
- `Subscription` vincula contrato ativo ao restaurante (não pode "desaparecer").

Anonimizar **somente os campos PII do perfil** (email, nome, passwordHash) é
o padrão da indústria (GDPR Recital 26, ICO UK guidance). Mantém integridade
referencial e obrigações fiscais.

### 5.2 Por que separar `LgpdService` em vez de métodos em `UsersService`?

Separação de responsabilidades (SRP). `UsersService` cuida de CRUD de perfis
com tenant isolation. `LgpdService` cuida de direitos do titular. Facilita:

- Auditoria (DPO lê 1 arquivo só)
- Testes (mock de `LgpdService` em testes de outros módulos)
- Rate limiting dedicado (3/h em DELETE não polui outros endpoints)

### 5.3 Por que JSON e não CSV/PDF?

JSON é "formato estruturado" aceito universally pela LGPD art. 18, V. CSV/PDF
são apresentações; podem ser geradas client-side a partir do JSON.

## 6. Próximos Requisitos

| ID           | Descrição                           | Quarter alvo |
| ------------ | ----------------------------------- | ------------ |
| `RF-AUTH-14` | Endpoint DPO: anonimizar outro user | Q3/2026      |
| `RF-AUTH-15` | Export em PDF + ZIP de comprovantes | Backlog      |
| `RF-AUTH-16` | Log de auditoria de operações LGPD  | Q3/2026      |

## 7. RTM (trecho)

| Status     | RFs                                |
| ---------- | ---------------------------------- |
| ✅ Done    | AUTH-12 (export), AUTH-13 (delete) |
| 🔴 Missing | AUTH-14..16                        |
