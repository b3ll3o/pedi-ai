'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Store, Loader2 } from 'lucide-react';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { Restaurante, type RestauranteProps } from '@/domain/admin/entities/Restaurante';
import styles from './RestaurantSelector.module.css';

interface RestaurantSelectorProps {
  hasUnsavedChanges?: boolean;
  /** Callback chamado após trocar de restaurante com sucesso */
  onRestaurantChange?: (restaurante: RestauranteProps) => void;
}

export function RestaurantSelector({
  hasUnsavedChanges = false,
  onRestaurantChange,
}: RestaurantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRestaurant, setPendingRestaurant] = useState<RestauranteProps | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const {
    restauranteSelecionado,
    restaurantesAcessiveis,
    isLoading,
    setRestaurante,
  } = useRestaurantStore();

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Confirma seleção de restaurante
  const confirmSelection = useCallback((restaurant: RestauranteProps) => {
    const restauranteEntity = Restaurante.reconstruir(restaurant);
    setRestaurante(restauranteEntity);
    onRestaurantChange?.(restaurant);
    setIsOpen(false);
    setFocusedIndex(-1);
  }, [setRestaurante, onRestaurantChange]);

  // Seleciona restaurante (com verificação de changes não salvas)
  const handleRestaurantSelect = useCallback((restaurant: RestauranteProps) => {
    if (hasUnsavedChanges) {
      setPendingRestaurant(restaurant);
      setShowConfirmDialog(true);
      setIsOpen(false);
    } else {
      confirmSelection(restaurant);
    }
  }, [hasUnsavedChanges, confirmSelection]);

  // Toggle dropdown
  const handleToggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(
        restauranteSelecionado
          ? restaurantesAcessiveis.findIndex((r) => r.id === restauranteSelecionado.id)
          : 0
      );
    }
  };

  // Navegação por teclado
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          setIsOpen(true);
          setFocusedIndex(0);
          event.preventDefault();
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          event.preventDefault();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev < restaurantesAcessiveis.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < restaurantesAcessiveis.length) {
            handleRestaurantSelect(restaurantesAcessiveis[focusedIndex]);
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, restaurantesAcessiveis, focusedIndex, handleRestaurantSelect]
  );

  const handleConfirmSwitch = () => {
    if (pendingRestaurant) {
      confirmSelection(pendingRestaurant);
    }
    setShowConfirmDialog(false);
    setPendingRestaurant(null);
  };

  const handleCancelSwitch = () => {
    setShowConfirmDialog(false);
    setPendingRestaurant(null);
  };

  const displayName = restauranteSelecionado?.nome || 'Selecionar restaurante';
  const isAtivo = restauranteSelecionado?.ativo ?? true;

  return (
    <div className={styles.selector} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.selectorButton} ${isOpen ? styles.open : ''}`}
        onClick={handleToggleDropdown}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Restaurante selecionado: ${displayName}${!isAtivo ? ' (inativo)' : ''}`}
        aria-controls="restaurant-listbox"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={16} className={styles.loadingIcon} aria-hidden="true" />
        ) : (
          <Store size={16} aria-hidden="true" />
        )}
        <span className={styles.selectorLabel}>{displayName}</span>
        {!isLoading && (
          <span className={`${styles.selectorIcon} ${isOpen ? styles.open : ''}`} aria-hidden="true">
            <ChevronDown />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={styles.dropdown}
          id="restaurant-listbox"
          role="listbox"
          aria-label="Restaurantes disponíveis"
        >
          {restaurantesAcessiveis.length === 0 ? (
            <div className={styles.dropdownEmpty}>Nenhum restaurante disponível</div>
          ) : (
            <ul className={styles.dropdownList} ref={listRef}>
              {restaurantesAcessiveis.map((restaurant, index) => (
                <li
                  key={restaurant.id}
                  className={`${styles.dropdownItem} ${
                    restauranteSelecionado?.id === restaurant.id ? styles.active : ''
                  } ${focusedIndex === index ? styles.focused : ''}`}
                  role="option"
                  aria-selected={restauranteSelecionado?.id === restaurant.id}
                  tabIndex={-1}
                  onClick={() => handleRestaurantSelect(restaurant)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span className={styles.restaurantName}>{restaurant.nome}</span>
                  {!restaurant.ativo && (
                    <span className={styles.inativoBadge}>Inativo</span>
                  )}
                  {restauranteSelecionado?.id === restaurant.id && (
                    <span className={styles.checkmark} aria-hidden="true">✓</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dialog de Confirmação */}
      {showConfirmDialog && (
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div className={styles.dialogContent}>
            <h3 id="dialog-title" className={styles.dialogTitle}>
              Alterar restaurante?
            </h3>
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