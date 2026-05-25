import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ModifierValue {
  id: string;
  name: string;
  price_adjustment: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  min_selections: number;
  max_selections: number;
  values: ModifierValue[];
}

interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  dietary_labels: string | null;
  available: boolean;
  category: { id: string; name: string };
  modifier_groups: ModifierGroup[];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<ProductResponse>>(
      `/menu/products/${id}?restaurantId=${restaurantId}`
    );

    if (!result.data || result.data.error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Unexpected error in /api/menu/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
