'use client';

import styles from './page.module.css';

export default function TablesPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mesas</h1>
        <div className={styles.actions}>
          <button data-testid="add-table-button" className={styles.addButton}>
            Adicionar Mesa
          </button>
        </div>
      </header>
      <div className={styles.placeholder}>
        Lista de mesas com QR codes aparecerá aqui
      </div>
    </div>
  );
}
