import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { QRCodeCryptoService } from '@/infrastructure/services/QRCodeCryptoService';

const QR_CODE_EXPIRY_HOURS = 24;

interface ValidateQRQuery {
  restaurantId: string;
  tableId: string;
  timestamp: string;
  signature: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const tableId = searchParams.get('tableId');
    const timestamp = searchParams.get('timestamp');
    const signature = searchParams.get('signature');

    if (!restaurantId || !tableId || !timestamp || !signature) {
      return NextResponse.json(
        { error: 'Parâmetros incompletos: restaurantId, tableId, timestamp e signature são obrigatórios' },
        { status: 400 }
      );
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      return NextResponse.json(
        { error: 'Timestamp inválido' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const qrAge = now - timestampNum;
    const expiryMs = QR_CODE_EXPIRY_HOURS * 60 * 60 * 1000;
    if (qrAge > expiryMs) {
      return NextResponse.json(
        { error: 'QR Code expirado' },
        { status: 410 }
      );
    }

    if (qrAge < -60000) {
      return NextResponse.json(
        { error: 'Timestamp inválido (futuro)' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, number, name, restaurant_id, active')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      );
    }

    if (!table.active) {
      return NextResponse.json(
        { error: 'Mesa inativa' },
        { status: 403 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, slug, active')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      );
    }

    if (!restaurant.active) {
      return NextResponse.json(
        { error: 'Restaurante inativo' },
        { status: 403 }
      );
    }

    const cryptoService = new QRCodeCryptoService();
    const payload = {
      restauranteId: restaurantId,
      mesaId: tableId,
      assinatura: signature,
    };

    const secret = process.env.QR_CODE_SECRET || 'default-secret-change-in-production';
    const isValidSignature = cryptoService.validarAssinatura(payload, secret);

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Assinatura inválida' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      table: {
        id: table.id,
        number: table.number,
        name: table.name,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
    });
  } catch (error) {
    console.error('Erro ao validar QR code:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar QR code' },
      { status: 500 }
    );
  }
}
