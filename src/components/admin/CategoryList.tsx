'use client';

import { useState, useCallback } from 'react';
import { categories } from '@/lib/supabase/types';
import styles from './CategoryList.module.css';

interface CategoryListProps {
  categories: categories[];
  onReorder: (updates: { id: string; sort_order: number }[]) => Promise<void>;
  onEdit: (category: categories) => void;
  onDelete: (id: string) => void;
}

export function CategoryList({ categories, onReorder, onEdit, onDelete }: CategoryListProps) {
  const [items, setItems] = useState(categories);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Set a transparent drag image
    const ghost = document.createElement('div');
    ghost.style.cssText = 'position:absolute;top:-9999px;opacity:0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedId || draggedId === targetId) {
        setDraggedId(null);
        return;
      }

      const dragIdx = items.findIndex((c) => c.id === draggedId);
      const dropIdx = items.findIndex((c) => c.id === targetId);
      if (dragIdx === -1 || dropIdx === -1) {
        setDraggedId(null);
        return;
      }

      const reordered = [...items];
      const [dragged] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, dragged);

      // Update sort_order values
      const updates = reordered.map((cat, index) => ({
        id: cat.id,
        sort_order: index,
      }));

      // Apply optimistic update
      setItems(reordered.map((cat, idx) => ({ ...cat, sort_order: idx })));
      setDraggedId(null);

      // Persist to API
      setIsReordering(true);
      try {
        await onReorder(updates);
      } catch {
        // Revert on failure
        setItems(categories);
      } finally {
        setIsReordering(false);
      }
    },
    [draggedId, items, onReorder, categories]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📁</span>
        <p>Nenhuma categoria encontrada</p>
      </div>
    );
  }

  return (
    <div className={styles.list} aria-busy={isReordering}>
      {items.map((category, index) => (
        <div
          key={category.id}
          data-testid="category-item"
          className={`${styles.item} ${draggedId === category.id ? styles.dragging : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, category.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, category.id)}
          onDragEnd={handleDragEnd}
        >
          <span className={styles.handle} aria-label="Arrastar para reordenar">
            ⋮⋮
          </span>

          <span className={styles.order}>#{index + 1}</span>

          <div className={styles.info}>
            <span className={styles.name}>{category.name}</span>
            {category.description && (
              <span className={styles.description}>{category.description}</span>
            )}
          </div>

          <span className={`${styles.badge} ${category.active ? styles.active : styles.inactive}`}>
            {category.active ? 'Ativa' : 'Inativa'}
          </span>

          <div className={styles.actions}>
            <button
              type="button"
              data-testid="edit-button"
              className={styles.btnIcon}
              onClick={() => onEdit(category)}
              title="Editar"
            >
              ✏️
            </button>
            <button
              type="button"
              data-testid="delete-button"
              className={`${styles.btnIcon} ${styles.btnDelete}`}
              onClick={() => onDelete(category.id)}
              title="Excluir"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}