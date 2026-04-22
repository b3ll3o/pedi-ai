'use client';

import styles from './page.module.css';

export default function OrdersPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pedidos</h1>
      </header>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Buscar pedidos..."
          data-testid="search-orders"
          className={styles.searchInput}
        />
        <select data-testid="filter-status" className={styles.filterSelect}>
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="preparing">Preparando</option>
          <option value="ready">Pronto</option>
          <option value="delivered">Entregue</option>
        </select>
      </div>
      <div className={styles.placeholder}>
        Lista de pedidos aparecerá aqui
      </div>
    </div>
  );
}
