import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const dateStr = searchParams.get('date')

  if (!slug || !dateStr) {
    return NextResponse.json({ error: 'slug and date are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: page, error } = await supabase
    .from('booking_pages')
    .select('*, booking_page_staff(staff(id, name, google_refresh_token, google_calendar_id))')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !page) {
    return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })
  }

  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()

  if (!page.available_days.includes(dayOfWeek)) {
    return NextResponse.json({ slots: [] })
  }

  const staffList = page.booking_page_staff
    .map((bps: any) => bps.staff)
    .filter((s: any) => s && s.google_refresh_token)

  if (!staffList.length) {
    return NextResponse.json({ slots: [] })
  }

  const slots = await getAvailableSlots(
    staffList,
    date,
    page.duration_minutes,
    page.available_start_hour,
    page.available_end_hour
  )

  return NextResponse.json({ slots })
}
