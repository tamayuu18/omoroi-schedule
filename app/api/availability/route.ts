import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { createServiceClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@/lib/google-calendar'
import { parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get('pageId')
  const dateStr = searchParams.get('date')

  if (!pageId || !dateStr) {
    return NextResponse.json({ error: 'pageId and date are required' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Fetch booking page with staff
    const { data: page, error: pageError } = await supabase
      .from('booking_pages')
      .select('*, booking_page_staff(staff(*))')
      .eq('id', pageId)
      .single()

    if (pageError || !page) {
      return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })
    }

    const staffList = (page.booking_page_staff ?? [])
      .map((bps: any) => bps.staff)
      .filter(Boolean)
      .filter((s: any) => s.is_active)

    // Parse the date in JST
    const date = toZonedTime(parseISO(dateStr), 'Asia/Tokyo')

    const slots = await getAvailableSlots(
      staffList,
      date,
      page.duration_minutes,
      page.buffer_minutes ?? 15,
      page.available_start_hour,
      page.available_end_hour,
      page.min_notice_hours ?? 24,
      process.env.ADMIN_STAFF_ID
    )

    return NextResponse.json({
      slots: slots.map((s) => ({
        time: s.time.toISOString(),
        staffId: s.staffId,
        staffName: s.staffName,
      })),
    })
  } catch (error) {
    console.error('Availability error:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
