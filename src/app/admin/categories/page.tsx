'use client';

import styles from './page.module.css';

export default function CategoriesPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Categorias</h1>
        <div className={styles.actions}>
          <button data-testid="add-category-button" className={styles.addButton}>
            Adicionar Categoria
          </button>
        </div>
      </header>
      <div className={styles.placeholder}>
        Lista de categorias aparecerá aqui
      </div>
    </div>
  );
}
