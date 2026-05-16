import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSubtitle} />
      </div>

      <div className={styles.search}>
        <div className={styles.skeletonSearch} />
      </div>

      <div className={styles.categories}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCategory} />
        ))}
      </div>
    </div>
  );
}
