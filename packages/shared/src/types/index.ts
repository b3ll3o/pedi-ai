/**
 * DTOs compartilhados entre apps/web, apps/api e demais pacotes.
 *
 * Regra: tipos em inglês (formato DTO consumido por HTTP), comentários
 * e nomes de campo em pt-BR quando vêm do domínio — mas o shape é o
 * que viaja pela rede. Domínio puro fica em `apps/web/src/domain/*`.
 *
 * Convenção:
 * - `*DTO` para tipos de transporte (request/response de API).
 * - Sem dependências de framework (React, Next, NestJS, Prisma).
 * - Campos opcionais marcados explicitamente com `?`.
 */

// =====================================================================
// Restaurante
// =====================================================================

export interface RestaurantDTO {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// =====================================================================
// Cardápio
// =====================================================================

export type DietaryLabel = 'vegan' | 'vegetarian' | 'gluten_free' | 'lactose_free' | 'spicy';

export interface ModifierValueDTO {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  active: boolean;
  sort_order: number;
}

export interface ModifierGroupDTO {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  sort_order: number;
  values: ModifierValueDTO[];
}

export interface ProductDTO {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  /** Preço em centavos (number) para evitar problemas de ponto flutuante. */
  price: number;
  dietary_labels: string[];
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryDTO {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  products: ProductDTO[];
}

export interface MenuResponse {
  restaurant: RestaurantDTO;
  categories: CategoryDTO[];
}

// =====================================================================
// Mesa
// =====================================================================

export interface TableDTO {
  id: string;
  restaurant_id: string;
  /** Identificador amigável exibido ao cliente (ex: "Mesa 5"). */
  name: string;
  /** Número sequencial derivado de `name`, quando aplicável. */
  number: number;
  /** QR code em base64 ou null quando ainda não gerado. */
  qr_code: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
}

export interface TableQRValidationResponse {
  valid: boolean;
  restaurant_id?: string;
  table_id?: string;
  error?: string;
}

// =====================================================================
// Pedido
// =====================================================================

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface OrderItemDTO {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  modifier_ids: string[];
  created_at: string;
}

export interface OrderHistoryEntryDTO {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export interface OrderDTO {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  customer_id: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  items: OrderItemDTO[];
  history: OrderHistoryEntryDTO[];
  created_at: string;
  updated_at: string;
}

// =====================================================================
// Autenticação / Usuário
// =====================================================================

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  /**
   * Role do usuário no restaurante. Por enquanto, livre (`string`) — cada
   * domínio narrow conforme necessário. Veja `UserRole` em
   * `apps/web/src/application/services/userService` para o conjunto pt-BR
   * usado no admin (`dono` | `gerente` | `atendente` | `cliente`).
   */
  role: string;
  restaurant_id?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTeamDTO {
  users: UserDTO[];
  current_user_role: string;
}
