import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cancelBookingById } from '@/lib/cancel-booking'

// 予約者本人がキャンセルリンクから予約情報を取得する
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const token = searchParams.get('token')

    if (!id || !token) {
      return NextResponse.json({ error: 'Missing id or token' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, candidate_name, start_time, status, cancellation_token, staff(name), booking_pages(title)')
      .eq('id', id)
      .single()

    if (!booking || booking.cancellation_token !== token) {
      return NextResponse.json({ error: '予約が見つかりませんでした' }, { status: 404 })
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        candidate_name: booking.candidate_name,
        start_time: booking.start_time,
        status: booking.status,
        staff_name: (booking.staff as any)?.name ?? null,
        page_title: (booking.booking_pages as any)?.title ?? null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 予約者本人がキャンセルを実行する
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, token } = body

    if (!id || !token) {
      return NextResponse.json({ error: 'Missing id or token' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, cancellation_token')
      .eq('id', id)
      .single()

    if (!booking || booking.cancellation_token !== token) {
      return NextResponse.json({ error: '予約が見つかりませんでした' }, { status: 404 })
    }

    const result = await cancelBookingById(id, '予約者本人')
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ ok: true, alreadyCancelled: result.alreadyCancelled })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
