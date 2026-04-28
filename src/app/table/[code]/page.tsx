'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useValidarQRCode } from '@/hooks/useMesa';
import { useTableStore } from '@/stores/tableStore';
import Logo from '@/app/components/Logo';
import styles from './page.module.css';

interface TableInfo {
  restaurantId: string;
  tableId: string;
  tableName: string;
}

export default function TableQRPage() {
  const _router = useRouter();
  const params = useParams();
  const code = params?.code as string | undefined;

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { setTable } = useTableStore();
  const validarQRCodeMutation = useValidarQRCode();

  // Evita que o effect rode múltiplas vezes - o mutateAsync do useMutation é estável
  // mas o objeto mutation é recriado em cada render
  const hasValidatedRef = useRef(false);

  // Erro derivado diretamente do código - sem setState em effect
  const codeError = !code ? 'Código da mesa não fornecido' : null;

  useEffect(() => {
    if (!code) {
      return;
    }

    // Evita loop infinito: só executa se ainda não validou ou se o code mudou
    if (hasValidatedRef.current) {
      return;
    }
    hasValidatedRef.current = true;

    setIsValidating(true);
    setError(null);

    // O QR code é um base64 encoded JSON com { restauranteId, mesaId, assinatura }
    // O código na URL é o QR code base64
    const qrCodeData = decodeURIComponent(code);
    const secretKey = process.env.NEXT_PUBLIC_QR_SECRET_KEY || 'default-secret';

    validarQRCodeMutation.mutateAsync({
      qrCode: qrCodeData,
      secret: secretKey,
    })
      .then((result) => {
        if (result.valido) {
          setTableInfo({
            restaurantId: result.restauranteId,
            tableId: result.mesaId,
            tableName: `Mesa ${result.mesaId.slice(-4)}`,
          });
          setTable(result.restauranteId, result.mesaId, `Mesa ${result.mesaId.slice(-4)}`);
        } else {
          setError('QR Code inválido ou expirado');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao validar QR Code');
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [code, validarQRCodeMutation, setTable]);

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
          <p data-testid="error-message" className={styles.error}>{codeError || error}</p>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
