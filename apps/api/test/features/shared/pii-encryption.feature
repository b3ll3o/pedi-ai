# language: pt
# BDD — PII Encryption at-rest (P0-06)
# Mapeia: LGPD Art. 46 (encriptação de dados pessoais em repouso)
# Cobertura: AES-256-GCM at-rest, propagação para `$transaction`,
#            sem camada dupla, rollback, fail-closed sem chave.
#
# Estes cenários documentam o contrato comportamental do
# `PiiCryptoService` + `createPiiPrismaExtension` + `comTransacaoEncriptada`.
# A verificação empírica completa (envolve PostgreSQL) está em
# `tests/integration/pii-encryption-transaction.spec.ts`. Aqui testamos
# o contrato do crypto unitário, sem DB, para travar regressões de
# algoritmo e formato.
#
# @pii @lgpd @P0-06
Funcionalidade: Encriptação de PII em repouso (LGPD Art. 46)
  Como um sistema que processa dados pessoais
  Quero que campos PII sejam persistidos como ciphertext
  Para cumprir a LGPD Art. 46 e resistir a dump do banco

  Contexto:
    Dado uma instância de PiiCryptoService com chave de 32+ caracteres
    E o formato de saída esperado `v1:<iv-hex>:<tag-hex>:<ct-hex>`

  # ────────────────────────────────────────────────────────────────
  # Criptografia simétrica
  # ────────────────────────────────────────────────────────────────

  @crypto @feliz
  Cenário: `encrypt` produz ciphertext no formato `v1:<iv>:<tag>:<ct>`
    Quando eu criptografo o valor "Maria Silva"
    Então o resultado deve começar com "v1:"
    E deve conter 4 segmentos separados por ":"
    E o segmento 2 (iv) deve ter 24 caracteres hexadecimais
    E o segmento 3 (tag) deve ter 32 caracteres hexadecimais
    E o resultado NÃO deve ser igual a "Maria Silva"

  @crypto @feliz
  Cenário: `decrypt` reverte o `encrypt` (round-trip)
    Quando eu criptografo o valor "João da Silva" e descriptografo o resultado
    Então o valor recuperado deve ser "João da Silva"

  @crypto @feliz
  Cenário: dois `encrypt` do mesmo plaintext produzem ciphertexts distintos (IV random)
    Quando eu criptografo "Ana" duas vezes
    Então os dois ciphertexts devem ser diferentes
    Mas ambos descriptografados devem retornar "Ana"

  @crypto @erro
  Cenário: `decrypt` retorna `null` em ciphertext adulterado (GCM authTag falhando)
    Quando eu criptografo "X" e troco o último caractere do resultado
    Então descriptografar o valor adulterado deve retornar `null`

  @crypto @feliz
  Cenário: `encrypt` aceita null/undefined e devolve o mesmo valor
    Quando eu criptografo o valor `null`
    Então o resultado deve ser `null`
    Quando eu criptografo o valor `undefined`
    Então o resultado deve ser `null`

  @crypto @feliz
  Cenário: `encrypt` aceita string vazia e devolve string vazia
    Quando eu criptografo o valor ""
    Então o resultado deve ser ""

  # ────────────────────────────────────────────────────────────────
  # Falha de chave (fail-closed em prod/staging)
  # ────────────────────────────────────────────────────────────────

  @crypto @erro @fail-closed
  Cenário: PiiCryptoService aborta o boot em produção sem chave
    Dada uma instância de PiiCryptoService sem PII_ENCRYPTION_KEY e NODE_ENV=production
    Quando o serviço for inicializado
    Então deve lançar erro mencionando PII_ENCRYPTION_KEY

  @crypto @feliz @dev
  Cenário: PiiCryptoService cai em modo plaintext em dev sem chave (UX preservada)
    Dada uma instância de PiiCryptoService sem PII_ENCRYPTION_KEY e NODE_ENV=development
    Quando o serviço for inicializado
    Então `isEnabled()` deve retornar `false`
    E `encrypt` deve retornar o plaintext como está
    E `decrypt` deve retornar o ciphertext como está

  # ────────────────────────────────────────────────────────────────
  # Lookup de campos PII por model (case-insensitive)
  # ────────────────────────────────────────────────────────────────

  @crypto @feliz
  Cenário: `getEncryptedFields` é case-insensitive (`UsersProfile` vs `usersProfile`)
    Quando eu consulto os campos encriptados de "UsersProfile"
    E eu consulto os campos encriptados de "usersProfile"
    Então ambos devem retornar o mesmo conjunto contendo "name"

  @crypto @feliz
  Cenário: `getEncryptedFields` para model não-PII retorna conjunto vazio
    Quando eu consulto os campos encriptados de "Product"
    Então o resultado deve ser vazio

  @crypto @feliz
  Cenário: `isEncryptedField(UsersProfile, name)` retorna true
    Quando eu pergunto se "name" é PII de "UsersProfile"
    Então a resposta deve ser `true`

  @crypto @feliz
  Cenário: `isEncryptedField(UsersProfile, email)` retorna false (lookup de login)
    Quando eu pergunto se "email" é PII de "UsersProfile"
    Então a resposta deve ser `false`

  # ────────────────────────────────────────────────────────────────
  # Cobertura de models PII
  # ────────────────────────────────────────────────────────────────

  @crypto @feliz
  Cenário: `Restaurant` tem PII em `phone` e `address`
    Quando eu consulto os campos encriptados de "Restaurant"
    Então o conjunto deve conter "phone"
    E o conjunto deve conter "address"

  @crypto @feliz
  Cenário: `Order` tem PII em `customerPhone`, `customerName`, `customerEmail`
    Quando eu consulto os campos encriptados de "Order"
    Então o conjunto deve conter "customerPhone"
    E o conjunto deve conter "customerName"
    E o conjunto deve conter "customerEmail"
