'use client';

/**
 * Onboarding Wizard — Escolha de Vertical
 *
 * **O QUE FAZ:**
 * Apresenta as verticais disponíveis (pizzaria, hamburgueria, etc) com preview
 * dos templates. Dono escolhe 1 → próximo passo do wizard.
 *
 * **POR QUE OFERECER TEMPLATES?**
 * - Reduz fricção (não precisa digitar cardápio do zero)
 * - Melhora ativação (cliente vê cardápio "vivo" mais rápido)
 * - Padroniza UX por vertical
 *
 * **Onboarding flow (4 steps):**
 * 1. Escolha da vertical (este componente)
 * 2. Configurar restaurante (nome, endereço, horários)
 * 3. Aplicar template (preview + confirma)
 * 4. Publicar (compartilhar QR Code)
 */

import { ArrowRight, ChefHat } from 'lucide-react';

import type { VerticalSlug } from '@/lib/onboarding/templates';

interface VerticalCardProps {
  slug: VerticalSlug;
  nome: string;
  emoji: string;
  descricao: string;
  totalProdutos: number;
  totalCategorias: number;
  selected: boolean;
  onSelect: (slug: VerticalSlug) => void;
}

function VerticalCard({
  slug,
  nome,
  emoji,
  descricao,
  totalProdutos,
  totalCategorias,
  selected,
  onSelect,
}: VerticalCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slug)}
      data-vertical-slug={slug}
      data-testid={`pedi-vertical-card-${slug}`}
      className={`group relative flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-all hover:border-blue-500 hover:shadow-lg ${
        selected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600' : 'border-gray-200 bg-white'
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">
          {emoji}
        </span>
        <div>
          <h3 className="font-semibold text-gray-900">{nome}</h3>
          <p className="text-sm text-gray-600">{descricao}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>📦 {totalCategorias} categorias</span>
        <span>🍕 {totalProdutos} produtos prontos</span>
      </div>
      {selected && (
        <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
          Selecionado
        </span>
      )}
    </button>
  );
}

export interface VerticalMetadata {
  slug: VerticalSlug;
  nome: string;
  emoji: string;
  descricao: string;
  totalProdutos: number;
  totalCategorias: number;
}

export interface VerticalStepProps {
  selected: VerticalSlug | null;
  onSelect: (slug: VerticalSlug) => void;
  onNext: () => void;
  verticals: VerticalMetadata[];
}

export function VerticalStep({ selected, onSelect, onNext, verticals }: VerticalStepProps) {
  return (
    <div data-testid="pedi-onboarding-step-1" className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-2 text-center">
        <ChefHat className="mx-auto h-12 w-12 text-blue-600" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-gray-900">Qual o tipo do seu restaurante?</h1>
        <p className="text-gray-600">
          Vamos pré-popular seu cardápio com produtos típicos da sua vertical. Você pode editar,
          adicionar ou remover tudo depois.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {verticals.map((v) => (
          <VerticalCard
            key={v.slug}
            slug={v.slug}
            nome={v.nome}
            emoji={v.emoji}
            descricao={v.descricao}
            totalProdutos={v.totalProdutos}
            totalCategorias={v.totalCategorias}
            selected={selected === v.slug}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          data-testid="pedi-onboarding-continue"
          disabled={!selected}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
