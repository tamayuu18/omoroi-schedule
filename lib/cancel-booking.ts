import { createServiceClient } from '@/lib/supabase/server'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { notifySlackCancelBooking } from '@/lib/slack'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export type CancelResult =
  | { ok: true; alreadyCancelled: boolean }
  | { ok: false; status: number; error: string }

/**
 * 予約をキャンセルする共通処理。
 * - ステータスを cancelled に更新
 * - Google Calendar イベントを削除（非致命的）
 * - Slack 通知（非致命的）
 *
 * 管理者・予約者どちらのキャンセルからも利用する。
 * cancelledBy には '管理者' / '予約者本人' などを渡す。
 */
export async function cancelBookingById(id: string, cancelledBy?: string): Promise<CancelResult> {
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(
      'status, staff_id, google_event_id, candidate_name, candidate_email, start_time, booking_pages(title), staff(name)'
    )
    .eq('id', id)
    .single()

  if (!booking) return { ok: false, status: 404, error: 'Booking not found' }
  if (booking.status === 'cancelled') return { ok: true, alreadyCancelled: true }

  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
  if (error) return { ok: false, status: 500, error: error.message }

  // Delete Google Calendar event (non-fatal)
  if (booking.google_event_id && booking.staff_id) {
    try {
      const adminStaffId = process.env.ADMIN_STAFF_ID
      const calendarOwnerId = adminStaffId ?? booking.staff_id
      await deleteCalendarEvent(calendarOwnerId, booking.google_event_id)
    } catch (e) {
      console.error('Calendar delete error (non-fatal):', e)
    }
  }

  // Slack cancel notification (non-fatal)
  const jstStart = toZonedTime(new Date(booking.start_time), 'Asia/Tokyo')
  await notifySlackCancelBooking({
    candidateName: booking.candidate_name,
    candidateEmail: booking.candidate_email,
    staffName: (booking.staff as any)?.name ?? '担当者',
    pageTitle: (booking.booking_pages as any)?.title ?? '',
    startTimeJst: format(jstStart, 'yyyy年M月d日 HH:mm'),
    cancelledBy,
  })

  return { ok: true, alreadyCancelled: false }
}
