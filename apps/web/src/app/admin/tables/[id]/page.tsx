'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTable, updateTable } from '@/application/services/tableService';
import { getSession } from '@/lib/supabase/auth';
import type { tables } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function TableEditPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;

  const [table, setTable] = useState<tables | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const [formData, setFormData] = useState({
    number: '',
    name: '',
    capacity: '',
    active: true,
  });

  useEffect(() => {
    if (!authChecked) return;

    const loadTable = async () => {
      try {
        const data = await getTable(tableId);
        setTable(data);
        setFormData({
          number: data.number.toString(),
          name: data.name || '',
          capacity: data.capacity?.toString() || '',
          active: data.active,
        });
      } catch (err) {
        console.error('Failed to load table:', err);
        setError('Erro ao carregar mesa');
      } finally {
        setIsLoading(false);
      }
    };
    loadTable();
  }, [tableId, authChecked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateTable(table.id, {
        number: parseInt(formData.number, 10),
        name: formData.name || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        active: formData.active,
      });
      router.push('/admin/mesas');
    } catch (err) {
      console.error('Failed to update table:', err);
      setError('Erro ao salvar mesa');
    } finally {
      setIsSaving(false);
    }
  };

  if (!authChecked || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{error || 'Mesa não encontrada'}</h2>
          <Link href="/admin/mesas">Voltar para mesas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/admin/mesas" className={styles.backButton}>
          ← Voltar
        </Link>
        <h1 className={styles.title}>Editar Mesa {table.number}</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="number">Número da Mesa *</label>
          <input
            type="number"
            id="number"
            value={formData.number}
            onChange={(e) => setFormData((prev) => ({ ...prev, number: e.target.value }))}
            required
            min="1"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="name">Nome</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Terraço, Varanda"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="capacity">Capacidade</label>
          <input
            type="number"
            id="capacity"
            value={formData.capacity}
            onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
            min="1"
            placeholder="Número de lugares"
          />
        </div>

        <div className={styles.checkboxField}>
          <label>
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
            />
            <span>Mesa ativa</span>
          </label>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/admin/mesas')}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
