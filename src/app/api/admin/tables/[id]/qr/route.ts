import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRPayload } from '@/lib/qr/generator'
import { validateQRPayload } from '@/lib/qr/validator'
import type { tables } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/tables/[id]/qr - Generate QR code for a table
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const secretKey = process.env.QR_SECRET_KEY
    if (!secretKey) {
      console.error('QR_SECRET_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'QR code generation is not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    const { data: table, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    if (!table.active) {
      return NextResponse.json(
        { error: 'Cannot generate QR code for inactive table' },
        { status: 400 }
      )
    }

    // Generate QR payload with HMAC signature
    const qrPayload = generateQRPayload(
      table.restaurant_id as string,
      table.id as string,
      secretKey
    )

    // Store the QR code data in the table
    const qrData = JSON.stringify({
      restaurant_id: table.restaurant_id,
      table_id: table.id,
      timestamp: qrPayload.timestamp,
      signature: qrPayload.signature,
    })

    const { error: updateError } = await supabase
      .from('tables')
      .update({ qr_code: qrData })
      .eq('id', id)

    if (updateError) {
      console.error('Error storing QR code:', updateError)
      // Continue anyway - we still return the QR payload
    }

    return NextResponse.json({
      table_id: table.id,
      table_number: table.number,
      table_name: table.name,
      qr_payload: qrPayload,
      qr_data: qrData,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]/qr:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/tables/[id]/qr - Validate QR code (for testing)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const secretKey = process.env.QR_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { error: 'QR_SECRET_KEY not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { restaurant_id, table_id, timestamp, signature } = body

    const payload = { restaurant_id, table_id, timestamp, signature }
    const result = validateQRPayload(payload, secretKey)

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]/qr POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
