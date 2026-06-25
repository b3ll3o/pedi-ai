import { CategoriaComItens } from '@/application/cardapio/services/ListarCardapioUseCase';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';

export interface BuscaCardapioInput {
  cardapio: CategoriaComItens[];
  /** Termo de busca (pt-BR). Case- e accent-insensitive. */
  termo: string;
  /** Pontuação mínima (0..1). Resultados abaixo são descartados. @default 0.25 */
  pontuacaoMinima?: number;
  /** Limite de resultados retornados. @default 50 */
  limite?: number;
}

export interface ItemBuscado {
  item: ItemCardapio;
  categoria: Categoria;
  /**
   * Pontuação de relevância 0..1.
   * 1.0 = match exato, 0 = sem match.
   */
  pontuacao: number;
  /**
   * Trecho do nome que casou com o termo (em minúsculas, sem acentos),
   * útil para destacar visualmente.
   */
  trechoCombinado?: string;
}

/**
 * Serviço de busca fuzzy no cardápio do cliente (RF-MENU-12).
 *
 * Algoritmo:
 *  - Normaliza termo e campos (case- e accent-insensitive).
 *  - Calcula similaridade combinando:
 *      a) Match exato (1.0)
 *      b) Match de prefixo (0.85)
 *      c) Match de substring (0.65)
 *      d) Match por token (0.5..0.8 conforme comprimento do token casado)
 *      e) Similaridade Levenshtein normalizada (0..0.5)
 *  - Combina nome + descrição + categoria com pesos diferentes.
 *
 * Mantido puro (zero deps) para ser usado tanto em SSR (Next.js server)
 * quanto no cliente, e facilmente testável.
 *
 * @spec(RF-MENU-12)
 * @see .openspec/specs/cardapio/design.md
 */
export class BuscaCardapioService {
  /**
   * @inheritdoc
   */
  buscar(input: BuscaCardapioInput): ItemBuscado[] {
    const termoNorm = this.normalizar(input.termo);
    if (termoNorm.length < 2) return [];

    const pontuacaoMinima = input.pontuacaoMinima ?? 0.25;
    const limite = input.limite ?? 50;

    const resultados: ItemBuscado[] = [];

    for (const grupo of input.cardapio) {
      for (const item of grupo.itens) {
        const pontuacaoNome = this.calcularSimilaridade(termoNorm, this.normalizar(item.nome));
        const pontuacaoDescricao = item.descricao
          ? this.calcularSimilaridade(termoNorm, this.normalizar(item.descricao))
          : 0;
        const pontuacaoCategoria = this.calcularSimilaridade(
          termoNorm,
          this.normalizar(grupo.categoria.nome)
        );

        // Pesos: nome 0.7, descrição 0.2, categoria 0.1
        const pontuacao = pontuacaoNome * 0.7 + pontuacaoDescricao * 0.2 + pontuacaoCategoria * 0.1;

        if (pontuacao >= pontuacaoMinima) {
          resultados.push({
            item,
            categoria: grupo.categoria,
            pontuacao,
            trechoCombinado: this.melhorTrecho(termoNorm, item.nome),
          });
        }
      }
    }

    return resultados.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, limite);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Normaliza string: minúsculas, sem acentos, trim.
   */
  private normalizar(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  /**
   * Calcula similaridade entre termo normalizado e campo normalizado (0..1).
   * Combina múltiplos sinais:
   *  - exato (1.0)
   *  - prefixo (0.85)
   *  - substring (0.65)
   *  - token match (0.5..0.85)
   *  - Levenshtein normalizado (0..0.5)
   */
  private calcularSimilaridade(termo: string, campo: string): number {
    if (campo.length === 0) return 0;

    // Match exato
    if (campo === termo) return 1.0;

    // Match de prefixo
    if (campo.startsWith(termo)) return 0.85;

    // Match de substring
    if (campo.includes(termo)) return 0.65;

    // Token match: divide campo em tokens (por whitespace OU hífen) e
    // verifica se algum contém termo (com ou sem typo)
    const tokensCampo = campo.split(/[\s\-_/.,]+/).filter(Boolean);
    let melhorToken = 0;
    for (const token of tokensCampo) {
      if (token === termo) {
        melhorToken = Math.max(melhorToken, 0.85);
      } else if (token.startsWith(termo)) {
        melhorToken = Math.max(melhorToken, 0.75);
      } else if (token.includes(termo)) {
        // Quanto maior a fração do token que casa, maior a pontuação
        const frac = termo.length / token.length;
        melhorToken = Math.max(melhorToken, 0.5 + frac * 0.25);
      } else {
        // Levenshtein por token (palavras pequenas com typo)
        const sim = this.similaridadeLevenshtein(termo, token);
        if (sim > 0.5) {
          melhorToken = Math.max(melhorToken, sim * 0.7);
        }
      }
    }

    if (melhorToken > 0) return melhorToken;

    // Fallback: Levenshtein contra o campo inteiro (útil para typos em palavra única)
    return this.similaridadeLevenshtein(termo, campo) * 0.5;
  }

  /**
   * Similaridade de Levenshtein normalizada (0..1).
   * 1 = idênticas, 0 = totalmente diferentes.
   */
  private similaridadeLevenshtein(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Limita distância máxima para evitar O(n*m) em strings muito grandes.
    // Se diferença de comprimento > 3, nem tenta (similaridade < 0.5).
    if (Math.abs(a.length - b.length) > 3) return 0;

    const m = a.length;
    const n = b.length;
    const dp: number[] = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;

    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        if (a[i - 1] === b[j - 1]) {
          dp[j] = prev;
        } else {
          dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
        }
        prev = tmp;
      }
    }

    const distancia = dp[n];
    const maxLen = Math.max(m, n);
    return 1 - distancia / maxLen;
  }

  /**
   * Retorna o trecho do campo original (não-normalizado) que contém o termo,
   * para destaque visual. Mantém a capitalização original.
   */
  private melhorTrecho(termoNorm: string, original: string): string | undefined {
    const originalNorm = this.normalizar(original);
    const idx = originalNorm.indexOf(termoNorm);
    if (idx < 0) return undefined;
    return original.slice(idx, idx + termoNorm.length);
  }
}
