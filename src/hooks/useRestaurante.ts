import { useEffect, useState } from 'react';

export interface RestaurantePublico {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  settings?: {
    horarios?: {
      abertura: string;
      fechamento: string;
    };
  };
}

interface UseRestauranteReturn {
  restaurante: RestaurantePublico | null;
  isLoading: boolean;
  error: Error | null;
}

export function useRestaurante(slug: string): UseRestauranteReturn {
  const [restaurante, setRestaurante] = useState<RestaurantePublico | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let isMounted = true;

    const fetchRestaurante = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/restaurantes/${encodeURIComponent(slug)}`);

        if (!isMounted) return;

        if (!response.ok) {
          if (response.status === 404) {
            setError(new Error('Restaurante não encontrado'));
          } else {
            setError(new Error('Erro ao carregar restaurante'));
          }
          setRestaurante(null);
          return;
        }

        const data = await response.json();
        if (isMounted) {
          setRestaurante(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Erro desconhecido'));
          setRestaurante(null);
          setIsLoading(false);
        }
      }
    };

    fetchRestaurante();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { restaurante, isLoading, error };
}
