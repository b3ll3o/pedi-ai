/**
 * Página 404 - Not Found
 * Redireciona usuários autenticados para o dashboard,
 * exibe página 404 pública para usuários não autenticados.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function NotFound() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4" role="status" aria-label="Carregando">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-20 bg-gray-200 rounded w-32 mx-auto" />
            <div className="flex gap-4 justify-center pt-4">
              <div className="h-10 bg-gray-200 rounded w-36" />
              <div className="h-10 bg-gray-200 rounded w-36" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center">
        <div
          className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full"
          aria-hidden="true"
        >
          <span className="text-3xl font-bold text-red-600">404</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ops! Página não encontrada
        </h1>

        <p className="text-gray-600 mb-8">
          A página que você procura não existe ou foi movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            aria-label="Voltar ao cardápio principal"
          >
            Voltar ao Cardápio
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            aria-label="Fazer login na sua conta"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    </main>
  );
}
