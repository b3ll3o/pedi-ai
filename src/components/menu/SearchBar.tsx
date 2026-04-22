'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMenuStore } from '@/stores/menuStore';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [value, setValue] = useState('');
  const setSearchQuery = useMenuStore((state) => state.setSearchQuery);

  // Debounced search - updates store 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, setSearchQuery]);

  const handleClear = useCallback(() => {
    setValue('');
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      <div className={styles.inputWrapper}>
        <svg
          className={styles.searchIcon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          type="text"
          className={styles.input}
          placeholder="Buscar produtos..."
          value={value}
          onChange={handleChange}
          aria-label="Buscar produtos"
          data-testid="search-input"
        />

        {value && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Limpar busca"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}