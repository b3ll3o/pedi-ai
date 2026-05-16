import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { tables } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';
import { generateQRPayload } from '@/lib/qr/generator';
import { validateQRPayload } from '@/lib/qr/validator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/tables/[id]/qr - Generate QR code for a table
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const { id } = await params;
    const restaurantId = getRestaurantId(authUser);

    const secretKey = process.env.QR_SECRET_KEY;
    if (!secretKey) {
      console.error('QR_SECRET_KEY environment variable is not set');
      return NextResponse.json({ error: 'QR code generation is not configured' }, { status: 500 });
    }

    if (isDevDatabase()) {
      const table = await db.select().from(tables).where(eq(tables.id, id)).limit(1).get();

      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }

      if (!table.active) {
        return NextResponse.json(
          { error: 'Cannot generate QR code for inactive table' },
          { status: 400 }
        );
      }

      const qrPayload = generateQRPayload(table.restaurant_id, table.id, secretKey);
      const qrData = JSON.stringify({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        timestamp: qrPayload.timestamp,
        signature: qrPayload.signature,
      });

      await db.update(tables).set({ qr_code: qrData }).where(eq(tables.id, id));

      return NextResponse.json({
        table_id: table.id,
        table_number: table.number,
        table_name: table.name,
        qr_payload: qrPayload,
        qr_data: qrData,
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: table, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (!table.active) {
      return NextResponse.json(
        { error: 'Cannot generate QR code for inactive table' },
        { status: 400 }
      );
    }

    const qrPayload = generateQRPayload(
      table.restaurant_id as string,
      table.id as string,
      secretKey
    );
    const qrData = JSON.stringify({
      restaurant_id: table.restaurant_id,
      table_id: table.id,
      timestamp: qrPayload.timestamp,
      signature: qrPayload.signature,
    });

    await supabase.from('tables').update({ qr_code: qrData }).eq('id', id);

    return NextResponse.json({
      table_id: table.id,
      table_number: table.number,
      table_name: table.name,
      qr_payload: qrPayload,
      qr_data: qrData,
    });
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]/qr:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/tables/[id]/qr - Validate QR code (for testing)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const _id = (await params).id;
    const _restaurantId = getRestaurantId(authUser);

    const secretKey = process.env.QR_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'QR_SECRET_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { restaurant_id, table_id, timestamp, signature } = body;

    const payload = { restaurant_id, table_id, timestamp, signature };
    const result = validateQRPayload(payload, secretKey);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]/qr POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
