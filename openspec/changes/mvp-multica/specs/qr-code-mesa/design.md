# Design: QR Code Mesa

## Overview

Sistema de QR code para identificar mesa e redirecionar para cardápio.

---

## Estrutura de Arquivos

```
src/domain/mesa/
├── services/
│   └── QRCodeCryptoService.ts   # HMAC-SHA256

src/app/api/
├── admin/mesas/[id]/qr/route.ts      # GET - gerar QR
└── mesas/validar/route.ts            # GET - validar QR

src/components/admin/
└── mesa/
    └── QRCodePreview.tsx              # Preview do QR
```

---

## QRCodeCryptoService

```typescript
// src/domain/mesa/services/QRCodeCryptoService.ts
export class QRCodeCryptoService {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  generateSignature(payload: QRCodePayload): string {
    const data = `${payload.restauranteId}:${payload.mesaId}:${payload.timestamp}`;
    return hmacSha256(data, this.secret);
  }

  verifySignature(payload: QRCodePayload, signature: string): boolean {
    const expected = this.generateSignature(payload);
    return timingSafeEqual(expected, signature);
  }

  isExpired(timestamp: number, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    return Date.now() - timestamp > maxAgeMs;
  }
}
```

---

## Geração de QR (Admin)

```typescript
// POST /api/admin/mesas/[id]/qr
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const mesa = await getMesa(params.id);
  const restaurante = await getRestaurante(mesa.restauranteId);

  const timestamp = Date.now();
  const payload = {
    restauranteId: restaurante.id,
    mesaId: mesa.id,
    timestamp,
  };

  const crypto = new QRCodeCryptoService(restaurante.secret);
  const signature = crypto.generateSignature(payload);

  const url = `https://app.exemplo.com/r/${restaurante.slug}?mesaId=${mesa.id}&t=${timestamp}&s=${signature}`;

  const qrImage = await generateQRCode(url);

  return Response.json({
    qrCode: `data:image/png;base64,${qrImage}`,
    url,
  });
}
```

---

## Validação de QR (Cliente)

```typescript
// GET /api/mesas/validar?mesaId=X&timestamp=Y&signature=Z
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mesaId = searchParams.get('mesaId');
  const timestamp = parseInt(searchParams.get('t') || '0');
  const signature = searchParams.get('s');

  const mesa = await getMesa(mesaId);
  if (!mesa || !mesa.ativa) {
    return Response.json({ valida: false, erro: 'Mesa inválida' }, { status: 400 });
  }

  const restaurante = await getRestaurante(mesa.restauranteId);
  const crypto = new QRCodeCryptoService(restaurante.secret);

  // Verificar expiração
  if (crypto.isExpired(timestamp)) {
    return Response.json({ valida: false, erro: 'QR expirado' }, { status: 400 });
  }

  // Verificar assinatura
  const payload = { restauranteId: restaurante.id, mesaId: mesa.id, timestamp };
  if (!crypto.verifySignature(payload, signature!)) {
    return Response.json({ valida: false, erro: 'Assinatura inválida' }, { status: 400 });
  }

  return Response.json({
    valida: true,
    mesa: { id: mesa.id, numero: mesa.numero, capacidade: mesa.capacidade },
    restaurante: { id: restaurante.id, nome: restaurante.nome, slug: restaurante.slug }
  });
}
```

---

## Fluxo Completo

```
ADMIN                              CLIENTE
  │                                    │
  │── Criar mesa                      │
  │── Gerar QR Code ──────────────────▶│ Escaneia QR
  │   (HMAC assinatura)               │
  │                                    │── Abre URL
  │                                    │── GET /api/mesas/validar
  │                                    │◀── Validação OK
  │                                    │── Redireciona para /r/[slug]?mesaId=X
  │                                    │
```

---

## Componente QRCodePreview (Admin)

```tsx
// src/components/admin/mesa/QRCodePreview.tsx
interface QRCodePreviewProps {
  mesa: Mesa;
  restaurante: Restaurante;
}

export function QRCodePreview({ mesa, restaurante }: QRCodePreviewProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/mesas/${mesa.id}/qr`)
      .then(res => res.json())
      .then(data => setQrCode(data.qrCode));
  }, [mesa.id]);

  return (
    <div className="qr-preview">
      {qrCode && <img src={qrCode} alt="QR Code" />}
      <a href={qrCode} download={`mesa-${mesa.numero}.png`}>
        Baixar QR Code
      </a>
    </div>
  );
}
```

---

## Checklist

- [ ] Implementar `QRCodeCryptoService`
- [ ] Criar endpoint `GET /api/admin/mesas/[id]/qr`
- [ ] Criar endpoint `GET /api/mesas/validar`
- [ ] Criar componente `QRCodePreview` (admin)
- [ ] Integrar no admin de mesas
- [ ] Testar fluxo completo
