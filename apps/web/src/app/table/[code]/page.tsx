'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import Logo from '@/app/components/Logo';
import { useTableStore } from '@/infrastructure/persistence/tableStore';

import styles from './page.module.css';

interface TableInfo {
  restaurantId: string;
  tableId: string;
  tableName: string;
}

interface ValidateApiResponse {
  valid: boolean;
  restauranteId?: string;
  mesaId?: string;
  error?: string;
}

/**
 * Página de validação de QR Code de mesa.
 *
 * O QR code é um payload base64-encoded JSON (gerado por
 * `MesaAggregate.gerarQRCodePayload` em apps/web ou pelo NestJS).
 * Esta página delega 100% da validação para a Route Handler
 * `/api/tables/validate` (server-only) — o segredo HMAC NUNCA é
 * exposto ao bundle do cliente.
 *
 * @see apps/web/src/app/api/tables/validate/route.ts
 */
export default function TableQRPage() {
  const _router = useRouter();
  const params = useParams();
  const code = params?.code as string | undefined;

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { setTable } = useTableStore();

  // Erro derivado diretamente do código - sem setState em effect
  const codeError = !code ? 'Código da mesa não fornecido' : null;

  useEffect(() => {
    if (!code) {
      return;
    }

    // Cleanup: impede setState se o componente desmontar antes do fetch terminar.
    let cancelled = false;
    // Deferir para fora do corpo síncrono do effect evita o lint
    // `react-hooks/set-state-in-effect` e elimina cascading renders.
    queueMicrotask(() => {
      if (cancelled) return;
      setIsValidating(true);
      setError(null);
    });

    const qrCodeData = decodeURIComponent(code);

    fetch('/api/tables/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode: qrCodeData }),
    })
      .then(async (response) => {
        const data = (await response.json()) as ValidateApiResponse;
        if (cancelled) return;

        if (response.ok && data.valid && data.restauranteId && data.mesaId) {
          setTableInfo({
            restaurantId: data.restauranteId,
            tableId: data.mesaId,
            tableName: `Mesa ${data.mesaId.slice(-4)}`,
          });
          setTable(data.restauranteId, data.mesaId, `Mesa ${data.mesaId.slice(-4)}`);
        } else {
          setError(data.error ?? 'QR Code inválido ou expirado');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao validar QR Code');
      })
      .finally(() => {
        if (!cancelled) {
          setIsValidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, setTable]);

  if (isValidating) {
    return (
      <div className={styles.container}>
        <header style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={24} />
        </header>
        <h1 data-testid="page-title">Mesa</h1>
        <div className={styles.content}>
          <div className={styles.loading}>Validando QR Code...</div>
        </div>
      </div>
    );
  }

  if (codeError || error) {
    return (
      <div className={styles.container}>
        <header style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={24} />
        </header>
        <h1 data-testid="page-title">Mesa</h1>
        <div className={styles.content}>
          <p data-testid="error-message" className={styles.error}>
            {codeError || error}
          </p>
          <p className={styles.instructions}>
            Escaneie o QR Code disponível em sua mesa para acessar o cardápio.
          </p>
          <Link href="/" className={styles.menuLink}>
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className={styles.container}>
        <header style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size={24} />
        </header>
        <h1 data-testid="page-title">Mesa</h1>
        <div className={styles.content}>
          <div className={styles.loading}>Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <Logo size={24} />
      </header>
      <h1 data-testid="page-title">Mesa</h1>
      <div className={styles.content}>
        <div data-testid="table-qr-code" className={styles.qrCode}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <div data-testid="table-info" className={styles.tableInfo}>
          <p className={styles.welcome}>Bem-vindo!</p>
          <p className={styles.tableName}>{tableInfo.tableName}</p>
        </div>
        <Link href="/menu" data-testid="menu-link" className={styles.menuLink}>
          Ver Cardápio
        </Link>
      </div>
    </div>
  );
}
