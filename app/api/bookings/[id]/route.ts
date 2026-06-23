import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cancelBookingById } from '@/lib/cancel-booking'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json()
    const { status } = body
    const { id } = await params

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    if (status === 'cancelled') {
      const result = await cancelBookingById(id, '管理者')
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
      return NextResponse.json({ ok: true })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
