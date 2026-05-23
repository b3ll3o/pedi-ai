import { useState, useCallback } from 'react';

export interface ProductFormState {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  dietaryLabels: string[];
  available: boolean;
  errors: { name?: string; price?: string; category?: string };
}

export interface UseProductFormStateReturn extends ProductFormState {
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setCategoryId: (categoryId: string) => void;
  setPrice: (price: string) => void;
  setDietaryLabels: (labels: string[]) => void;
  setAvailable: (available: boolean) => void;
  toggleDietaryLabel: (label: string) => void;
  validateForm: () => boolean;
  resetForm: () => void;
}

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'spicy',
  'sweet',
  'sour',
  'bitter',
  'umami',
];

export function useProductFormState(
  initialProduct?: {
    name?: string;
    description?: string;
    category_id?: string;
    price?: number;
    dietary_labels?: string[];
    available?: boolean;
  },
  defaultCategoryId?: string
): UseProductFormStateReturn {
  const [name, setName] = useState(initialProduct?.name ?? '');
  const [description, setDescription] = useState(initialProduct?.description ?? '');
  const [categoryId, setCategoryId] = useState(
    initialProduct?.category_id ?? defaultCategoryId ?? ''
  );
  const [price, setPrice] = useState(initialProduct?.price?.toString() ?? '');
  const [dietaryLabels, setDietaryLabels] = useState<string[]>(
    initialProduct?.dietary_labels ?? []
  );
  const [available, setAvailable] = useState(initialProduct?.available ?? true);
  const [errors, setErrors] = useState<{ name?: string; price?: string; category?: string }>({});

  const toggleDietaryLabel = useCallback((label: string) => {
    setDietaryLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: { name?: string; price?: string; category?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum < 0) {
      newErrors.price = 'Preço inválido';
    }

    if (!categoryId) {
      newErrors.category = 'Categoria é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, price, categoryId]);

  const resetForm = useCallback(() => {
    setName(initialProduct?.name ?? '');
    setDescription(initialProduct?.description ?? '');
    setCategoryId(initialProduct?.category_id ?? defaultCategoryId ?? '');
    setPrice(initialProduct?.price?.toString() ?? '');
    setDietaryLabels(initialProduct?.dietary_labels ?? []);
    setAvailable(initialProduct?.available ?? true);
    setErrors({});
  }, [initialProduct, defaultCategoryId]);

  return {
    name,
    description,
    categoryId,
    price,
    dietaryLabels,
    available,
    errors,
    setName,
    setDescription,
    setCategoryId,
    setPrice,
    setDietaryLabels,
    setAvailable,
    toggleDietaryLabel,
    validateForm,
    resetForm,
  };
}

export { DIETARY_OPTIONS };
