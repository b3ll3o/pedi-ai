'use client';

import styles from './page.module.css';

export default function ProductsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Produtos</h1>
        <div className={styles.actions}>
          <button data-testid="add-product-button" className={styles.addButton}>
            Adicionar Produto
          </button>
        </div>
      </header>
      <div className={styles.placeholder}>
        Grade de produtos aparecerá aqui
      </div>
    </div>
  );
}
