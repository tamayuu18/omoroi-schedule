import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'
import { addMinutes } from 'date-fns'

export async function GET() {
  const supabase = createServiceClient()
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, staff(name), booking_page:booking_pages(title)')
    .order('start_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, staffId, slotTime, name, email, phone, note } = body

  if (!slug || !staffId || !slotTime || !name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch booking page
  const { data: page, error: pageError } = await supabase
    .from('booking_pages')
    .select('*, booking_page_staff(staff(id, name, google_calendar_id))')
    .eq('slug', slug)
    .single()

  if (pageError || !page) {
    return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })
  }

  const staffInfo = page.booking_page_staff
    .map((bps: any) => bps.staff)
    .find((s: any) => s?.id === staffId)

  if (!staffInfo) {
    return NextResponse.json({ error: 'Staff not found for this page' }, { status: 404 })
  }

  const startTime = new Date(slotTime)
  const endTime = addMinutes(startTime, page.duration_minutes)

  // Upsert CRM contact
  let contactId: string | null = null
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', email)
    .single()

  if (existingContact) {
    contactId = existingContact.id
  } else {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({ name, email, phone: phone || null, source: 'booking' })
      .select('id')
      .single()
    contactId = newContact?.id || null
  }

  // Create Google Calendar event
  let googleEventId: string | null = null
  let googleMeetLink: string | null = null
  try {
    const result = await createCalendarEvent(
      staffId,
      staffInfo.google_calendar_id || 'primary',
      {
        title: `【面談】${name} - ${page.title}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        candidateName: name,
        candidateEmail: email,
        note: note || '',
      }
    )
    googleEventId = result.eventId
    googleMeetLink = result.meetLink
  } catch (err) {
    console.error('Google Calendar event creation failed:', err)
  }

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_page_id: page.id,
      staff_id: staffId,
      contact_id: contactId,
      candidate_name: name,
      candidate_email: email,
      candidate_phone: phone || null,
      candidate_note: note || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      google_event_id: googleEventId,
      google_meet_link: googleMeetLink,
    })
    .select()
    .single()

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 })
  }

  return NextResponse.json({ booking, googleMeetLink }, { status: 201 })
}
