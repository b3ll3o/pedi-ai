'use client';

/**
 * @spec(RF-ADM-FF-03, RNF-SEC-FF-01)
 *
 * Modal acessível para criar uma nova feature flag.
 *
 * Acessibilidade:
 *  - role="dialog", aria-modal, focus trap manual (Esc + foco inicial).
 *  - srOnly <legend> no fieldset.
 *  - Foco retorna ao botão "+ Nova" após fechar.
 *
 * RBAC:
 *  - owner: vê botão Criar.
 *  - manager: vê apenas banner "Apenas owner pode criar flags".
 *
 * Validação client-side (espelha Zod):
 *  - key: regex ^[a-z0-9_]{3,64}$.
 *  - valueType + defaultValue coerentes.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import type { FlagValueType } from '@/application/admin/feature-flags/use-cases/useCriarFeatureFlag';

import styles from './ModalCriarFlag.module.css';

export type FeatureFlagRole = 'owner' | 'manager';

export interface CriarFlagSubmitPayload {
  key: string;
  description?: string;
  valueType: FlagValueType;
  defaultValue: unknown;
}

export interface ModalCriarFlagProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CriarFlagSubmitPayload) => void | Promise<void>;
  role: FeatureFlagRole;
}

const KEY_REGEX = /^[a-z0-9_]{3,64}$/;

interface FormState {
  key: string;
  description: string;
  valueType: FlagValueType;
  boolValue: boolean;
  stringValue: string;
  numberValue: string;
  jsonValue: string;
}

const EMPTY_FORM: FormState = {
  key: '',
  description: '',
  valueType: 'BOOLEAN',
  boolValue: false,
  stringValue: '',
  numberValue: '0',
  jsonValue: '{}',
};

export function ModalCriarFlag({ open, onClose, onSubmit, role }: ModalCriarFlagProps) {
  if (!open) return null;
  return <ModalBody onClose={onClose} onSubmit={onSubmit} role={role} />;
}

type ModalBodyProps = Omit<ModalCriarFlagProps, 'open'>;

function ModalBody({ onClose, onSubmit, role }: ModalBodyProps) {
  const titleId = useId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Foco inicial
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const isOwner = role === 'owner';

  const validate = ():
    | { ok: true; payload: CriarFlagSubmitPayload }
    | { ok: false; message: string } => {
    if (!KEY_REGEX.test(form.key)) {
      return {
        ok: false,
        message:
          'Chave deve estar em snake_case com 3 a 64 caracteres (apenas letras minúsculas, dígitos e underscore).',
      };
    }

    let defaultValue: unknown;
    switch (form.valueType) {
      case 'BOOLEAN':
        defaultValue = form.boolValue;
        break;
      case 'STRING':
        defaultValue = form.stringValue;
        break;
      case 'NUMBER': {
        const n = Number(form.numberValue);
        if (Number.isNaN(n)) return { ok: false, message: 'Valor padrão NUMBER inválido.' };
        defaultValue = n;
        break;
      }
      case 'JSON': {
        try {
          defaultValue = JSON.parse(form.jsonValue);
        } catch {
          return { ok: false, message: 'Valor padrão JSON inválido.' };
        }
        break;
      }
    }

    const payload: CriarFlagSubmitPayload = {
      key: form.key,
      valueType: form.valueType,
      defaultValue,
    };
    if (form.description.trim().length > 0) {
      payload.description = form.description.trim();
    }
    return { ok: true, payload };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = validate();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await onSubmit(result.payload);
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.dialog}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Nova feature flag
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className={styles.closeBtn}
          >
            ×
          </button>
        </header>

        {!isOwner && (
          <p className={styles.banner} role="status" data-testid="rbac-banner">
            Apenas owner pode criar flags. Você está em modo leitura.
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <fieldset className={styles.fieldset} disabled={!isOwner}>
            <legend className={styles.srOnly}>Dados da nova flag</legend>

            <div className={styles.field}>
              <label htmlFor="key" className={styles.label}>
                Chave
              </label>
              <input
                id="key"
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })}
                placeholder="minha_flag"
                autoComplete="off"
                className={styles.input}
                required
                aria-describedby="key-help"
              />
              <p id="key-help" className={styles.help}>
                snake_case, 3 a 64 caracteres (letras minúsculas, dígitos, _).
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Descrição (opcional)
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                maxLength={500}
                className={styles.textarea}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label} id="tipo-label">
                Tipo do valor
              </span>
              <div className={styles.radioGroup} role="radiogroup" aria-labelledby="tipo-label">
                {(['BOOLEAN', 'STRING', 'NUMBER', 'JSON'] as const).map((vt) => (
                  <label key={vt} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="valueType"
                      value={vt}
                      checked={form.valueType === vt}
                      onChange={() => setForm({ ...form, valueType: vt })}
                      aria-label={
                        vt === 'BOOLEAN'
                          ? 'Boolean'
                          : vt === 'STRING'
                            ? 'Texto'
                            : vt === 'NUMBER'
                              ? 'Número'
                              : 'JSON'
                      }
                    />
                    <span>
                      {vt === 'BOOLEAN'
                        ? 'Boolean'
                        : vt === 'STRING'
                          ? 'Texto'
                          : vt === 'NUMBER'
                            ? 'Número'
                            : 'JSON'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="defaultValue" className={styles.label}>
                Valor padrão
              </label>
              {form.valueType === 'BOOLEAN' && (
                <label className={styles.toggleLabel}>
                  <input
                    id="defaultValue"
                    type="checkbox"
                    role="switch"
                    aria-checked={form.boolValue}
                    checked={form.boolValue}
                    onChange={(e) => setForm({ ...form, boolValue: e.target.checked })}
                  />
                  <span>{form.boolValue ? 'true' : 'false'}</span>
                </label>
              )}
              {form.valueType === 'STRING' && (
                <input
                  id="defaultValue"
                  type="text"
                  value={form.stringValue}
                  data-testid="input-valor-texto"
                  onChange={(e) => setForm({ ...form, stringValue: e.target.value })}
                  className={styles.input}
                />
              )}
              {form.valueType === 'NUMBER' && (
                <input
                  id="defaultValue"
                  type="number"
                  value={form.numberValue}
                  onChange={(e) => setForm({ ...form, numberValue: e.target.value })}
                  className={styles.input}
                />
              )}
              {form.valueType === 'JSON' && (
                <textarea
                  id="defaultValue"
                  data-testid="input-valor-json"
                  value={form.jsonValue}
                  onChange={(e) => setForm({ ...form, jsonValue: e.target.value })}
                  rows={4}
                  className={styles.textarea}
                  spellCheck={false}
                />
              )}
            </div>
          </fieldset>

          {error && (
            <p className={styles.error} role="alert" data-testid="form-error">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.secondaryBtn}>
              Cancelar
            </button>
            {isOwner && (
              <button
                type="submit"
                className={styles.primaryBtn}
                data-testid="btn-criar-flag-submit"
              >
                Criar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
