import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { notifySlackCancelBooking } from '@/lib/slack'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

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
      .select('staff_id, google_event_id, candidate_name, candidate_email, start_time, booking_pages(title), staff(name)')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (status === 'cancelled' && booking) {
      // Delete Google Calendar event
      if (booking.google_event_id && booking.staff_id) {
        try {
          const adminStaffId = process.env.ADMIN_STAFF_ID
          const calendarOwnerId = adminStaffId ?? booking.staff_id
          await deleteCalendarEvent(calendarOwnerId, booking.google_event_id)
        } catch (e) {
          console.error('Calendar delete error (non-fatal):', e)
        }
      }

      // Slack cancel notification
      const startTime = new Date(booking.start_time)
      const jstStart = toZonedTime(startTime, 'Asia/Tokyo')
      const pageTitle = (booking.booking_pages as any)?.title ?? ''
      const staffName = (booking.staff as any)?.name ?? '担当者'
      await notifySlackCancelBooking({
        candidateName: booking.candidate_name,
        candidateEmail: booking.candidate_email,
        staffName,
        pageTitle,
        startTimeJst: format(jstStart, 'yyyy年M月d日 HH:mm'),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
