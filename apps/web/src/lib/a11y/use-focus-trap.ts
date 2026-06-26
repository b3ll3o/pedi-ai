import { useEffect, type RefObject } from 'react';

/**
 * Trap Tab/Shift+Tab dentro do container referenciado. Quando `active` é
 * `false`, o efeito é no-op (não faz sentido prender foco em algo
 * desmontado).
 *
 * Foca o primeiro elemento focável ao ativar (se nenhum estiver focado
 * dentro do container), restaura foco ao elemento previamente focado
 * quando desativa. Esc fecha o modal via callback opcional.
 *
 * Não é um substituto completo de biblioteca (sem aria-modal polyfill,
 * sem scroll-lock, sem focus restoration em unmounts concorrentes) — mas
 * é o suficiente para diálogos simples e mantém o bundle pequeno.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      return Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('aria-hidden')
      );
    }

    // Foco inicial — só movemos se nada dentro já estiver focado (evita
    // roubar foco de quem acabou de abrir via clique no botão trigger).
    const initial = getFocusable();
    if (initial.length > 0 && !container.contains(document.activeElement)) {
      initial[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container!.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restaura foco ao elemento anterior (geralmente o botão que abriu
      // o modal) — sem isso, usuário volta para `body` e Tab começa do topo.
      previouslyFocused?.focus?.();
    };
  }, [active, onEscape, containerRef]);
}
