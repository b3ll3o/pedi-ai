'use client';

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import styles from './CartBadge.module.css';

export function CartBadge() {
  const totalItems = useCartStore((state) => state.getTotalItems());
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevCountRef = useRef(totalItems);

  useEffect(() => {
    if (totalItems !== prevCountRef.current && prevCountRef.current > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 300);
      prevCountRef.current = totalItems;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = totalItems;
  }, [totalItems]);

  if (totalItems === 0) {
    return null;
  }

  const handleClick = () => {
    setIsOpen(true);
  };

  return (
    <button
      className={`${styles.badge} ${isPulsing ? styles.pulse : ''}`}
      onClick={handleClick}
      aria-label={`Carrinho com ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
      type="button"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className={styles.count}>{totalItems > 99 ? '99+' : totalItems}</span>
    </button>
  );
}