import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateQRPayload } from '@/lib/qr/validator'
import { logger } from '@/lib/logger';



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

    // Validate HMAC signature
    const payload = { restaurant_id, table_id, timestamp, signature }
    const isValid = validateQRPayload(payload, secretKey)

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Assinatura inválida' },
        { status: 401 }
      )
    }

    // Look up table from database
    const supabase = await createClient()
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

    // Return table info
    const tableResponse: TableResponse = {
      id: table.id as string,
      name: (table.name ?? `Mesa ${table.number}`) as string,
      number: table.number as number
    }

    return NextResponse.json({ valid: true, table: tableResponse })
  } catch (error) {
    logger.error("mesa", "Unexpected error in /api/tables/validate:", { error: error })
    return NextResponse.json(
      { valid: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}