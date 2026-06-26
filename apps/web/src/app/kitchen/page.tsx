import type { Metadata } from 'next';

import { KitchenClient } from './KitchenClient';

// TODO: pegar `restauranteId` da sessão (cookie/JWT) quando houver auth
// dedicada para a cozinha. Por enquanto o ID é fixo em dev. Quando mover
// para o servidor, dá pra fazer redirect aqui (RSC) sem precisar carregar
// o bundle do client.
const DEMO_RESTAURANT_ID = 'demo-restaurant';

export const metadata: Metadata = {
  title: 'Cozinha | Pedi-AI',
  description:
    'Sistema de gestão da cozinha: pedidos em tempo real, atualização de status e controle de preparo.',
  robots: { index: false, follow: false },
};

export default function KitchenPage() {
  return <KitchenClient restauranteId={DEMO_RESTAURANT_ID} />;
}
