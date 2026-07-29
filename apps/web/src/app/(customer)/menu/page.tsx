import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import MenuPageClient from './MenuPageClient';

// Cookie set pela API NestJS após login (apps/api/src/auth/cookie-helper.ts)
const ACCESS_TOKEN_COOKIE = 'pedi_ai_access';
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001';

interface MeResponse {
  id: string;
  email: string;
  role: string;
  restaurantId?: string | null;
}

interface MenuPageProps {
  searchParams: Promise<{ restaurant?: string }>;
}

export async function generateMetadata({ searchParams }: MenuPageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: 'Cardápio Digital | Pedi-AI - Faça Seu Pedido Online',
    description:
      'Explore o cardápio digital do restaurante. Veja categorias, produtos e faça seu pedido online. Funciona offline e descubra promoções.',
    alternates: {
      canonical: params.restaurant
        ? `/restaurantes/${params.restaurant}/cardapio`
        : '/restaurantes',
    },
    openGraph: {
      title: 'Cardápio Digital | Pedi-AI',
      description: 'Explore o cardápio digital do restaurante e faça seu pedido online.',
      url: params.restaurant ? `/restaurantes/${params.restaurant}/cardapio` : '/restaurantes',
      type: 'website',
    },
  };
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const params = await searchParams;
  const queryRestaurantId = params.restaurant;

  // 1. Se veio `?restaurant=`, usar o query param (acesso público via deep link)
  if (queryRestaurantId) {
    return <MenuPageClient restaurantId={queryRestaurantId} />;
  }

  // 2. Sem query param: rota protegida — exige autenticação via cookie JWT
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect('/login');
  }

  // 3. Buscar perfil do usuário na API para obter restaurantId (clientes
  // são vinculados a um restaurante no momento do cadastro/seed). Falha
  // na API é tratada como "não autenticado" → /login.
  let me: MeResponse | null = null;
  try {
    const res = await fetch(`${API_INTERNAL_URL}/auth/me`, {
      headers: { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` },
      cache: 'no-store',
    });
    if (res.ok) {
      me = (await res.json()) as MeResponse;
    }
  } catch {
    // Falha de rede — segue para fallback abaixo
  }

  if (!me) {
    redirect('/login');
  }

  // 4. Cliente (role 'cliente') sem restaurantId vinculado: precisa escolher
  // restaurante antes de acessar o cardápio.
  if (!me.restaurantId) {
    redirect('/restaurantes');
  }

  return <MenuPageClient restaurantId={me.restaurantId} />;
}
