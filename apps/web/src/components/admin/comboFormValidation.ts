export interface ComboFormErrors {
  name?: string;
  bundle_price?: string;
  items?: string;
}

export function validateComboForm(
  name: string,
  bundlePrice: string,
  selectedProducts: Record<string, number>
): ComboFormErrors {
  const newErrors: ComboFormErrors = {};

  if (!name.trim()) {
    newErrors.name = 'Nome é obrigatório';
  }

  const priceNum = parseFloat(bundlePrice);
  if (!bundlePrice || isNaN(priceNum) || priceNum < 0) {
    newErrors.bundle_price = 'Preço inválido';
  }

  const productEntries = Object.entries(selectedProducts).filter(([, qty]) => qty > 0);
  if (productEntries.length === 0) {
    newErrors.items = 'Adicione pelo menos um produto ao combo';
  }

  return newErrors;
}
