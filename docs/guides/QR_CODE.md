# Guia de Segurança de QR Code — Pedi-AI

## 1. Visão Geral

O sistema de QR Code do Pedi-AI é responsável pela identificação de mesas em restaurantes. Cada mesa possui um QR Code único que, quando escaneado, redireciona o cliente para a página do cardápio digital daquele restaurante e mesa específica.

O sistema foi projetado com foco em **segurança contra adulteração (tampering)**, impedindo que atacantes criem QR Codes válidos para mesas que não existem ou manipulem IDs de restaurantes/mesas para acessos não autorizados.

### Problema que o Sistema Resolve

Sem proteção por assinatura, um atacante poderia:
- Gerar QR Codes falsos para mesas de outros restaurantes
- Modificar o `restaurant_id` para acessar cardápios de restaurantes diferentes
- Manipular o `table_id` para fazer pedidos em nome de outras mesas

---

## 2. Formato do QR Code

O QR Code codifica uma URL com os seguintes parâmetros de consulta (query string):

```
/table?restaurant_id=X&table_id=Y&timestamp=Z&signature=S
```

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `restaurant_id` | UUID v4 | Identificador único do restaurante |
| `table_id` | UUID v4 | Identificador único da mesa |
| `timestamp` | Unix Timestamp (ms) | Momento da geração do QR Code |
| `signature` | Hex string (64 chars) | Assinatura HMAC-SHA256 |

### Exemplo de URL Completa

```
/table?restaurant_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&table_id=f1e2d3c4-b5a6-9870-dcba-1234567890ab&timestamp=1714320000000&signature=3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6
```

### Validação de Formato UUID

Ambos `restaurant_id` e `table_id` devem seguir o formato UUID v4:

```
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

---

## 3. Assinatura HMAC-SHA256

### Como a Assinatura é Gerada

A assinatura é gerada no momento da criação do QR Code usando o algoritmo **HMAC-SHA256**. O processo é o seguinte:

1. **Mensagem**: Concatenação de `restaurant_id`, `table_id` e `timestamp` separados por `:`:
   ```
   mensagem = "{restaurant_id}:{table_id}:{timestamp}"
   ```
   Exemplo:
   ```
   a1b2c3d4-e5f6-7890-abcd-ef1234567890:f1e2d3c4-b5a6-9870-dcba-1234567890ab:1714320000000
   ```

2. **Chave Secreta**: A chave secreta é obtida da variável de ambiente `QR_SECRET_KEY` e deve ser mantida em sigilo absoluto.

3. **Computação HMAC**:
   ```typescript
   import { createHmac } from 'crypto'

   const signature = createHmac('sha256', secretKey)
     .update(message)
     .digest('hex')
   ```

4. **Output**: A assinatura é codificada em string hexadecimal (64 caracteres).

### Como a Assinatura é Validada

Na validação, o servidor:
1. Extrai `restaurant_id`, `table_id` e `timestamp` da URL
2. Recomputa a assinatura usando a mesma chave secreta e mensagem
3. Compara a assinatura computada com a assinatura fornecida

**Esta é uma operação stateless** — não há necessidade de armazenar dados de sessão no servidor para validar QR Codes.

---

## 4. Validação de Timestamp

### Expiry de 24 Horas

O timestamp é validado para garantir que QR Codes antigos não possam ser reutilizados indefinidamente.

```typescript
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 horas em milissegundos

function isTimestampValid(timestamp: number): boolean {
  const now = Date.now()
  return timestamp > 0 && timestamp <= now && now - timestamp <= EXPIRY_MS
}
```

### Critérios de Validação

Um timestamp é considerado válido se:
1. É **maior que zero** (evita timestamps negativos ou epoch inválido)
2. É **menor ou igual ao momento atual** (evita timestamps futuros)
3. A diferença entre agora e o timestamp é **menor ou igual a 24 horas**

### Por Que 24 Horas?

O período de 24 horas foi escolhido como equilíbrio entre:
- **Conveniência**: Restaurantes podem gerar QR Codes no início do dia sem preocupações com expiração durante o serviço
- **Segurança**: Limita a janela de tempo em que um QR Code capturado pode ser reutilizado

---

## 5. Comparação Timing-Safe

### O Problema: Ataques de Timing

Comparações de strings convencionais (como `===` ou `==`) retornam `false` assim que encontram o primeiro caractere diferente. Isso significa que o tempo de resposta do servidor varia de acordo com quantos caracteres iniciais estão corretos.

Um atacante pode explorar isso para fazer **ataques de timing**:

1. Tenta assinaturas com o primeiro caractere correto
2. Mede o tempo de resposta (mais lento = mais caracteres certos)
3. Repete iterativamente até descobrir a assinatura completa

### A Solução: timingSafeEqual

O Node.js fornece `crypto.timingSafeEqual()` que executa uma comparação de tempo constante:

```typescript
import { timingSafeEqual } from 'crypto'

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return timingSafeEqual(bufA, bufB)
}
```

### Como Funciona

1. Ambas as strings são convertidas para `Buffer`s de mesmo tamanho
2. `timingSafeEqual` compara todos os bytes independentemente da quantidade de matches
3. O tempo de execução é constante independentemente de onde está a primeira diferença
4. Se os tamanhos forem diferentes, retorna `false` imediatamente (evita leaks de tamanho)

### Importância

Esta proteção é **crítica** para a segurança do sistema. Sem ela, a segurança do HMAC seria comprometida por um atacante paciente que mede diferenças de nanossegundos em múltiplas tentativas.

---

## 6. Segurança Implementada

O sistema de QR Code do Pedi-AI implementa múltiplas camadas de segurança:

### ✅ HMAC-SHA256 Signature

- **O que**: Algoritmo de assinatura criptográfica resistente a falsificação
- **Por que**: Apenas servidores com acesso à chave secreta podem gerar assinaturas válidas
- **Implementação**: `crypto.createHmac('sha256', secretKey)`

### ✅ Timing-Safe Comparison

- **O que**: Comparação de strings em tempo constante
- **Por que**: Previne ataques de timing que poderiam revelar a assinatura
- **Implementação**: `crypto.timingSafeEqual()`

### ✅ Timestamp Validation (24h)

- **O que**: Validação de expiração do QR Code
- **Por que**: Limita a janela de reutilização de QR Codes capturados
- **Implementação**: Verificação de `now - timestamp <= 24h`

### ✅ UUID Format Validation

- **O que**: Validação rigorosa do formato UUID v4 para `restaurant_id` e `table_id`
- **Por que**: Garante que IDs malformados sejam rejeitados antes do processamento
- **Implementação**: Regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

### ✅ Tampering Detection

- **O que**: Qualquer modificação nos parâmetros invalida a assinatura
- **Por que**: Impossibilita que atacantes alterem restaurant_id ou table_id sem invalidar o QR Code
- **Implementação**: A assinatura é computada sobre todos os parâmetros; modificar qualquer um deles causa mismatch

---

## 7. Melhorias Recomendadas

Baseado em análise de segurança e práticas recomendadas da indústria, as seguintes melhorias são recomendadas para versões futuras:

### 7.1 Adicionar Nonce para Prevenir Replay Exato

**Problema**: Um atacante pode capturar um QR Code válido e reutilizá-lo exatamente como está dentro da janela de 24 horas.

**Solução**: Adicionar um valor `nonce` (número aleatório único) ao payload:
```
/table?restaurant_id=X&table_id=Y&timestamp=Z&nonce=N&signature=S
```

O servidor deve:
1. Armazenar nonces usados em um cache/banco (Redis é ideal para isso)
2. Rejeitar QR Codes com nonces já utilizados
3. Limpar nonces expirados após o expiry da assinatura

**Benefício**: Elimina completamente ataques de replay.

### 7.2 Reduzir Expiry de 24h para 1-4 Horas

**Problema**: Janela de 24 horas é suficientemente longa para um atacante determined.

**Solução**: Reduzir o expiry para 1-4 horas:
```typescript
const EXPIRY_MS = 4 * 60 * 60 * 1000 // 4 horas
```

**Considerações**:
- Restaurantes precisariam gerar QR Codes mais frequentemente
- Pode ser necessário um sistema de geração automática/batch

**Benefício**: Reduz significativamente a janela de ataque.

### 7.3 Assinar Metadados Adicionais

**Problema**: O sistema atual não distingue entre diferentes tipos de acesso ou permissões.

**Solução**: Assinar metadados adicionais:
```typescript
message = `${restaurant_id}:${table_id}:${timestamp}:${permissions}:${session_id}`
```

onde `permissions` pode indicar:
- Apenas visualização do cardápio
- Permissão para fazer pedidos
- Nível de desconto aplicado

**Benefício**: Flexibilidade para permissões granulares sem perder segurança.

### 7.4 Adicionar Rate Limiting no Endpoint de Validação

**Problema**: Um atacante pode fazer força bruta tentando diferentes assinaturas.

**Solução**: Implementar rate limiting no endpoint `/table`:
```
- Limite de 10 validações por IP por minuto
- Limite de 100 validações por restaurant_id por hora
- Bloquear IPs após 5 falhas consecutivas
```

**Benefício**: Dificulta significativamente ataques de força bruta.

### 7.5 Adicionar QR Code Rotativo

**Problema**: QR Codes estáticos podem ser fotografados e reutilizados.

**Solução**: Implementar QR Codes que mudam periodicamente:
- QR Code válido apenas por 15-30 minutos
- Renovação automática via WebSocket ou polling
- Display digital ou impressão que muda o QR Code

**Benefício**: Elimina o risco de QR Codes fotografados serem reutilizados.

---

## 8. Fluxo de Validação

O fluxo completo de validação de um QR Code é o seguinte:

### Passo 1: Recebimento do QR Code

```
Cliente escaneia QR Code → Redirecionamento para /table?restaurant_id=X&table_id=Y&timestamp=Z&signature=S
```

### Passo 2: Extração de Parâmetros

O servidor extrai os parâmetros da query string:
- `restaurant_id` = valor do parâmetro
- `table_id` = valor do parâmetro
- `timestamp` = valor do parâmetro (convertido para número)
- `signature` = valor do parâmetro

### Passo 3: Verificação de Campos Obrigatórios

```typescript
if (!payload.restaurant_id || !payload.table_id || 
    payload.timestamp === undefined || !payload.signature) {
  return { valid: false, error: 'Missing required fields' }
}
```

Se qualquer campo estiver faltando, a validação falha imediatamente.

### Passo 4: Validação de Formato UUID

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (!isValidUUID(payload.restaurant_id)) {
  return { valid: false, error: 'Invalid restaurant_id format' }
}

if (!isValidUUID(payload.table_id)) {
  return { valid: false, error: 'Invalid table_id format' }
}
```

IDs malformados são rejeitados antes de qualquer processamento criptográfico.

### Passo 5: Validação de Timestamp

```typescript
function isTimestampValid(timestamp: number): boolean {
  const now = Date.now()
  return timestamp > 0 && timestamp <= now && now - timestamp <= EXPIRY_MS
}
```

Verifica se:
1. Timestamp não é negativo ou zero
2. Timestamp não está no futuro
3. QR Code não expirou (dentro de 24 horas)

### Passo 6: Computação da Assinatura

O servidor recomputa a assinatura usando:
1. A chave secreta do ambiente (`QR_SECRET_KEY`)
2. A mesma mensagem formatada: `${restaurant_id}:${table_id}:${timestamp}`

```typescript
function computeSignature(
  restaurantId: string,
  tableId: string,
  timestamp: number,
  secretKey: string
): string {
  const message = `${restaurantId}:${tableId}:${timestamp}`
  return createHmac('sha256', secretKey).update(message).digest('hex')
}
```

### Passo 7: Comparação Timing-Safe

```typescript
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return timingSafeEqual(bufA, bufB)
}
```

A assinatura computada é comparada com a fornecida usando comparação em tempo constante.

### Passo 8: Resposta ao Cliente

```typescript
if (!timingSafeCompare(computedSignature, payload.signature)) {
  return { valid: false, error: 'Signature mismatch' }
}

return { valid: true }
```

- Se válido: Cliente é redirecionado para o cardápio da mesa
- Se inválido: Mensagem de erro exibida, acesso negado

---

## Implementação de Referência

### Geração (src/lib/qr/generator.ts)

```typescript
import { createHmac } from 'crypto'

export interface QRPayload {
  restaurant_id: string
  table_id: string
  timestamp: number
  signature: string
}

export function generateQRPayload(
  restaurantId: string,
  tableId: string,
  secretKey: string
): QRPayload {
  const timestamp = Date.now()
  const message = `${restaurantId}:${tableId}:${timestamp}`

  const signature = createHmac('sha256', secretKey)
    .update(message)
    .digest('hex')

  return {
    restaurant_id: restaurantId,
    table_id: tableId,
    timestamp,
    signature
  }
}
```

### Validação (src/lib/qr/validator.ts)

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXPIRY_MS = 24 * 60 * 60 * 1000

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

function isTimestampValid(timestamp: number): boolean {
  const now = Date.now()
  return timestamp > 0 && timestamp <= now && now - timestamp <= EXPIRY_MS
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return timingSafeEqual(bufA, bufB)
}

export function validateQRPayload(
  payload: QRPayload,
  secretKey: string
): { valid: boolean; error?: string } {
  // Validações de campos obrigatórios
  if (!payload.restaurant_id || !payload.table_id || 
      payload.timestamp === undefined || !payload.signature) {
    return { valid: false, error: 'Missing required fields' }
  }

  // Validação de formato UUID
  if (!isValidUUID(payload.restaurant_id)) {
    return { valid: false, error: 'Invalid restaurant_id format' }
  }
  if (!isValidUUID(payload.table_id)) {
    return { valid: false, error: 'Invalid table_id format' }
  }

  // Validação de timestamp
  if (!isTimestampValid(payload.timestamp)) {
    return { valid: false, error: 'Timestamp expired or invalid' }
  }

  // Recomputa e compara assinatura
  const computedSignature = createHmac('sha256', secretKey)
    .update(`${payload.restaurant_id}:${payload.table_id}:${payload.timestamp}`)
    .digest('hex')

  if (!timingSafeCompare(computedSignature, payload.signature)) {
    return { valid: false, error: 'Signature mismatch' }
  }

  return { valid: true }
}
```

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `QR_SECRET_KEY` | Chave secreta para geração e validação de assinaturas HMAC | Sim |

**Nota**: A `QR_SECRET_KEY` deve ser uma string aleatória de pelo menos 32 caracteres. Recomenda-se usar um gerador de UUIDs ou strings criptograficamente seguras.

---

## Versionamento

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0.0 | 2026-04-28 | Versão inicial do documento |

---

## Referências

- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [OWASP Timing Attacks](https://owasp.org/www-community/attacks/Timing_attack)
- [HMAC - Wikipedia](https://en.wikipedia.org/wiki/HMAC)
- [UUID v4 Specification](https://datatracker.ietf.org/doc/html/rfc4122)
