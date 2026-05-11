# Spec: Cardápio Público — MVP Multica

## 1. Overview

**Bounded Context:** cardapio, restaurante
**Scope:** Rota pública `/r/[slug]` para acessar cardápio via QR code
**Status:** draft

---

## 2. Definições

| Termo | Definição |
|-------|-----------|
| **Slug** | URL-friendly identifier do restaurante (ex: `restaurante-john`) |
| **QR Code** | Código QR contém `restauranteId` e `mesaId` |
| **Cardápio** | Lista de categorias e produtos do restaurante |

---

## 3. Funcionalidades

### 3.1 Acesso via QR Code

| Feature | Descrição |
|---------|-----------|
| QR Code payload | `{restauranteId}:{mesaId}:{timestamp}:{signature}` |
| Validação | HMAC-SHA256 com segredo do restaurante |
| Redirect | QR code redireciona para `/r/[slug]?mesaId=X` |

### 3.2 Exibição do Cardápio

| Feature | Descrição |
|---------|-----------|
| Header | Logo, nome, horário do restaurante |
| Categorias | Lista de categorias ordenadas |
| Produtos | Grid de produtos por categoria |
| Modificadores | Seletor ao visualizar produto |
| Offline | Cardápio disponível offline (IndexedDB) |

### 3.3 Carrinho

| Feature | Descrição |
|---------|-----------|
| Adicionar item | Botão "+" no produto ou detail |
| Ver carrinho | Ícone com badge de quantidade |
| Modificadores | Selecionar ao adicionar |
| Persistência | Carrinho salvo em IndexedDB |

---

## 4. Rotas

### 4.1 Cardápio Público

```
/r/[slug]              # Cardápio do restaurante
/r/[slug]/produto/[id] # Detail do produto
```

### 4.2 Query Params

| Param | Descrição |
|-------|-----------|
| `mesaId` | ID da mesa (do QR code) |
| `debug` | Modo debug (opcional) |

---

## 5. API Endpoints

### GET /api/restaurantes/[slug]

**Response:**
```json
{
  "id": "uuid",
  "nome": "Restaurante John",
  "slug": "restaurante-john",
  "logo": "url",
  "horario": {
    "abertura": "11:00",
    "fechamento": "22:00"
  },
  "ativo": true
}
```

### GET /api/restaurantes/[slug]/cardapio

**Response:**
```json
{
  "categorias": [
    {
      "id": "uuid",
      "nome": "Entradas",
      "ordem": 1,
      "produtos": [
        {
          "id": "uuid",
          "nome": "Carpaccio",
          "descricao": "...",
          "preco": 45.90,
          "imagem": "url",
          "disponivel": true,
          "modificadores": [
            {
              "id": "uuid",
              "nome": "Tamanho",
              "obrigatorio": true,
              "valores": [
                { "id": "uuid", "nome": "P", "preco": 0 },
                { "id": "uuid", "nome": "M", "preco": 5 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### GET /api/mesas/validar

**Query:** `?mesaId=X&restauranteId=Y`

**Response:**
```json
{
  "valida": true,
  "mesa": {
    "id": "uuid",
    "numero": "5",
    "capacidade": 4
  }
}
```

---

## 6. Offline

| Recurso | Estratégia |
|---------|------------|
| Dados do restaurante | Cache IndexedDB, TTL 24h |
| Cardápio | Cache IndexedDB, TTL 24h |
| Carrinho | Zustand + IndexedDB persist |
| Pedido (criação) | Fila offline com retry |

---

## 7. Critérios de Aceitação

- [ ] Cliente escaneia QR → vê cardápio do restaurante correto
- [ ] Logo e nome do restaurante aparecem no header
- [ ] Categorias ordenadas corretamente
- [ ] Produtos mostram preço, imagem, disponibilidade
- [ ] Modificadores funcionam ao adicionar item
- [ ] Carrinho atualiza corretamente
- [ ] Cardápio funciona offline após primeiro carregamento
- [ ] Mesa é identificada no pedido

---

## 8. Out of Scope

- Autenticação do cliente
- Busca no cardápio
- Favoritos/historico
- Avaliações

---

## 9. Notas

- Slug deve ser único por restaurante
- QR code é gerado no admin e impresso para colar na mesa
- MesaId é extraído do QR e salvo no pedido
