'use client';

import styles from './page.module.css';

export default function TableQRPage() {
  return (
    <div className={styles.container}>
      <h1 data-testid="page-title">Mesa</h1>
      <div className={styles.content}>
        <div className={styles.inputGroup}>
          <label htmlFor="table-code">Código da mesa</label>
          <input
            type="text"
            id="table-code"
            data-testid="table-code-input"
            placeholder="Digite o código da mesa"
          />
        </div>
        <button data-testid="validate-table-button" type="button">
          Validar Mesa
        </button>
        <div data-testid="table-qr-code" className={styles.qrCode}>
          {/* QR Code will be rendered here */}
        </div>
        <div data-testid="table-info" className={styles.tableInfo}>
          {/* Table info will be displayed here */}
        </div>
        <a href="/menu" data-testid="menu-link" className={styles.menuLink}>
          Ver Cardápio
        </a>
        <p data-testid="error-message" className={styles.error}></p>
        <p data-testid="success-message" className={styles.success}></p>
      </div>
    </div>
  );
}
