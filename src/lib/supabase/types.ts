// ============================================================
// Supabase Database TypeScript Types — pedi-ai
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type Enum_order_status = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type Enum_payment_method = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'other';
export type Enum_payment_status = 'pending' | 'paid' | 'refunded' | 'failed';
export type Enum_user_role = 'dono' | 'gerente' | 'atendente' | 'cliente';

// ── Tables ────────────────────────────────────────────────────

export type restaurants = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type tables = {
  id: string;
  restaurant_id: string;
  number: number;
  qr_code: string | null;
  name: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
};

export type categories = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type products = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  dietary_labels: string[] | null;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type modifier_groups = {
  id: string;
  restaurant_id: string;
  name: string;
  required: boolean;
  min_selections: number;
  max_selections: number;
  created_at: string;
};

export type modifier_values = {
  id: string;
  modifier_group_id: string;
  name: string;
  price_adjustment: number;
  available: boolean;
  created_at: string;
};

export type combos = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  bundle_price: number;
  image_url: string | null;
  available: boolean;
  created_at: string;
  updated_at: string;
};

export type combo_items = {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
};

export type orders = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  customer_id: string | null;
  status: Enum_order_status;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: Enum_payment_method | null;
  payment_status: Enum_payment_status;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type order_items = {
  id: string;
  order_id: string;
  product_id: string;
  combo_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
};

export type order_status_history = {
  id: string;
  order_id: string;
  status: Enum_order_status;
  notes: string | null;
  created_at: string;
};

export type users_profiles = {
  id: string;
  user_id: string;
  restaurant_id: string;
  role: Enum_user_role;
  name: string;
  email: string;
  created_at: string;
};

export type payment_intents = {
  id: string;
  order_id: string;
  restaurant_id: string;
  amount: number;
  currency: string;
  status: Enum_payment_status;
  payment_method: Enum_payment_method;
  Mercado_pago_payment_id: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string | null;
  created_at: string;
};

export type subscriptions = {
  id: string;
  restaurant_id: string;
  status: string;
  plan_type: string;
  price_cents: number;
  currency: string;
  trial_started_at: string;
  trial_ends_at: string;
  trial_days: number;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

// ── Database Root Type ───────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: restaurants;
        Insert: Omit<restaurants, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<restaurants, 'id'>>;
      };
      tables: {
        Row: tables;
        Insert: Omit<tables, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<tables, 'id'>>;
      };
      categories: {
        Row: categories;
        Insert: Omit<categories, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<categories, 'id'>>;
      };
      products: {
        Row: products;
        Insert: Omit<products, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<products, 'id'>>;
      };
      modifier_groups: {
        Row: modifier_groups;
        Insert: Omit<modifier_groups, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<modifier_groups, 'id'>>;
      };
      modifier_values: {
        Row: modifier_values;
        Insert: Omit<modifier_values, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<modifier_values, 'id'>>;
      };
      combos: {
        Row: combos;
        Insert: Omit<combos, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<combos, 'id'>>;
      };
      combo_items: {
        Row: combo_items;
        Insert: Omit<combo_items, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<combo_items, 'id'>>;
      };
      orders: {
        Row: orders;
        Insert: Omit<orders, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<orders, 'id'>>;
      };
      order_items: {
        Row: order_items;
        Insert: Omit<order_items, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<order_items, 'id'>>;
      };
      order_status_history: {
        Row: order_status_history;
        Insert: Omit<order_status_history, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<order_status_history, 'id'>>;
      };
      users_profiles: {
        Row: users_profiles;
        Insert: Omit<users_profiles, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<users_profiles, 'id'>>;
      };
      payment_intents: {
        Row: payment_intents;
        Insert: Omit<payment_intents, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<payment_intents, 'id'>>;
      };
      subscriptions: {
        Row: subscriptions;
        Insert: Omit<subscriptions, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<subscriptions, 'id'>>;
      };
    };
    Enums: {
      order_status: Enum_order_status;
      payment_method: Enum_payment_method;
      payment_status: Enum_payment_status;
      user_role: Enum_user_role;
    };
  };
};

// ── Realtime Channel Types ────────────────────────────────────

export type RealtimeChannel = {
  channel_name: string;
  table: keyof Database['public']['Tables'];
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
};

export type OrderRealtimePayload = {
  commit_timestamp: string;
  errors: null;
  old_record: orders | null;
  record: orders;
};

export type OrderItemRealtimePayload = {
  commit_timestamp: string;
  errors: null;
  old_record: order_items | null;
  record: order_items;
};