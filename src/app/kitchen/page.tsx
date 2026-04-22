'use client';

import styles from './page.module.css';

export default function KitchenPage() {
  return (
    <div className={styles.container}>
      <h1 data-testid="page-title">Cozinha</h1>
      <div data-testid="kitchen-orders">
        <p>Nenhum pedido pendente</p>
      </div>
    </div>
  );
}