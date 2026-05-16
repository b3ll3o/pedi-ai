import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { tables } from '@/infrastructure/database/schema'
import { QRCodeCryptoService } from '@/infrastructure/services/QRCodeCryptoService'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/logger';

const qrService = new QRCodeCryptoService();

interface ValidateRequest {
  restaurant_id: string
  table_id: string
  timestamp: number
  signature: string
}

interface TableResponse {
  id: string
  name: string
  number: number
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json()

    const { restaurant_id, table_id, timestamp, signature } = body

    // Validate required fields
    if (!restaurant_id || !table_id || !timestamp || !signature) {
      return NextResponse.json(
        { valid: false, error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      )
    }

    // Get secret key from environment
    const secretKey = process.env.QR_SECRET_KEY
    if (!secretKey) {
      logger.error("mesa", "QR_SECRET_KEY environment variable is not set");
      return NextResponse.json(
        { valid: false, error: 'Erro interno de configuração' },
        { status: 500 }
      )
    }

    // Validate HMAC signature using domain service
    const payload = { restauranteId: restaurant_id, mesaId: table_id, assinatura: signature }
    const isValid = qrService.validarAssinatura(payload, secretKey)

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Assinatura inválida' },
        { status: 401 }
      )
    }

    // Look up table from database
    if (isDevDatabase()) {
      const result = await db
        .select()
        .from(tables)
        .where(and(
          eq(tables.id, table_id),
          eq(tables.restaurant_id, restaurant_id),
          eq(tables.active, true)
        ))
        .limit(1);

      if (!result || result.length === 0) {
        return NextResponse.json(
          { valid: false, error: 'Mesa não encontrada' },
          { status: 404 }
        )
      }

      const table = result[0];
      const tableResponse: TableResponse = {
        id: table.id,
        name: table.name ?? `Mesa ${table.number}`,
        number: table.number
      }

      return NextResponse.json({ valid: true, table: tableResponse })
    } else {
      const supabase = getSupabaseAdmin()
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('id', table_id)
        .eq('restaurant_id', restaurant_id)
        .eq('active', true)
        .single()

      if (tableError || !table) {
        return NextResponse.json(
          { valid: false, error: 'Mesa não encontrada' },
          { status: 404 }
        )
      }

      const tableResponse: TableResponse = {
        id: table.id as string,
        name: (table.name ?? `Mesa ${table.number}`) as string,
        number: table.number as number
      }

      return NextResponse.json({ valid: true, table: tableResponse })
    }
  } catch (error) {
    logger.error("mesa", "Unexpected error in /api/tables/validate:", { error: error })
    return NextResponse.json(
      { valid: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
