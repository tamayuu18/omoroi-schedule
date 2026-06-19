import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { deleteCalendarEvent } from '@/lib/google-calendar'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient()
    const body = await req.json()
    const { status } = body
    const { id } = await params

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    // Fetch booking before updating to get calendar info
    const { data: booking } = await supabase
      .from('bookings')
      .select('staff_id, google_event_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Delete Google Calendar event when cancelling
    if (status === 'cancelled' && booking?.google_event_id && booking?.staff_id) {
      try {
        await deleteCalendarEvent(booking.staff_id, booking.google_event_id)
        // Also delete from admin calendar if set
        const adminStaffId = process.env.ADMIN_STAFF_ID
        if (adminStaffId && adminStaffId !== booking.staff_id) {
          await deleteCalendarEvent(adminStaffId, booking.google_event_id).catch(() => {})
        }
      } catch (e) {
        console.error('Calendar delete error (non-fatal):', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
