'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Store } from 'lucide-react';
import { useRestaurantStore, type RestaurantInfo } from '@/stores/restaurantStore';
import styles from './RestaurantSelector.module.css';

interface RestaurantSelectorProps {
  restaurantes: RestaurantInfo[];
  onRestaurantChange?: (restaurant: RestaurantInfo) => void;
  hasUnsavedChanges?: boolean;
}

export function RestaurantSelector({
  restaurantes,
  onRestaurantChange,
  hasUnsavedChanges = false,
}: RestaurantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRestaurant, setPendingRestaurant] = useState<RestaurantInfo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { selectedRestaurantId, selectedRestaurantName, setRestaurante } = useRestaurantStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelectClick = () => {
    setIsOpen(!isOpen);
  };

  const handleRestaurantClick = (restaurant: RestaurantInfo) => {
    if (hasUnsavedChanges) {
      setPendingRestaurant(restaurant);
      setShowConfirmDialog(true);
      setIsOpen(false);
    } else {
      selectRestaurant(restaurant);
    }
  };

  const selectRestaurant = (restaurant: RestaurantInfo) => {
    setRestaurante(restaurant.id, restaurant.name);
    onRestaurantChange?.(restaurant);
    setIsOpen(false);
  };

  const handleConfirmSwitch = () => {
    if (pendingRestaurant) {
      selectRestaurant(pendingRestaurant);
    }
    setShowConfirmDialog(false);
    setPendingRestaurant(null);
  };

  const handleCancelSwitch = () => {
    setShowConfirmDialog(false);
    setPendingRestaurant(null);
  };

  const displayName = selectedRestaurantName || 'Selecionar restaurante';

  return (
    <div className={styles.selector} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.selectorButton} ${isOpen ? styles.open : ''}`}
        onClick={handleSelectClick}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Restaurante selecionado: ${displayName}`}
      >
        <Store size={16} aria-hidden="true" />
        <span className={styles.selectorLabel}>{displayName}</span>
        <span className={`${styles.selectorIcon} ${isOpen ? styles.open : ''}`} aria-hidden="true">
          <ChevronDown />
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {restaurantes.length === 0 ? (
            <div className={styles.dropdownEmpty}>Nenhum restaurante disponível</div>
          ) : (
            <ul className={styles.dropdownList}>
              {restaurantes.map((restaurant) => (
                <li
                  key={restaurant.id}
                  className={`${styles.dropdownItem} ${
                    restaurant.id === selectedRestaurantId ? styles.active : ''
                  }`}
                  role="option"
                  aria-selected={restaurant.id === selectedRestaurantId}
                  onClick={() => handleRestaurantClick(restaurant)}
                >
                  {restaurant.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className={styles.dialog} role="dialog" aria-modal="true">
          <div className={styles.dialogContent}>
            <h3 className={styles.dialogTitle}>Alterar restaurante?</h3>
            <p className={styles.dialogText}>
              Você tem alterações não salvas. Deseja realmente trocar de restaurante? Todas as
              alterações não salvas serão perdidas.
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={`${styles.dialogButton} ${styles.dialogButtonCancel}`}
                onClick={handleCancelSwitch}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.dialogButton} ${styles.dialogButtonConfirm}`}
                onClick={handleConfirmSwitch}
              >
                Trocar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
