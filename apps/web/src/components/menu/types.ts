// Shared types for menu components

export interface ModifierGroup {
  id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  required: boolean;
  modifier_values: ModifierValue[];
}

export interface ModifierValue {
  id: string;
  name: string;
  price_adjustment: number;
  available: boolean;
  order: number;
}

export interface SelectedModifier {
  group_id: string;
  group_name: string;
  modifier_id: string;
  name: string;
  price_adjustment: number;
}

export interface CartItem {
  product_id: string;
  name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  modifiers: SelectedModifier[];
  total_price: number;
}
