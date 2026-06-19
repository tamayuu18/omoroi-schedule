import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pageId, slotTime, staffId, name, email, phone, note } = body

    if (!pageId || !slotTime || !staffId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch booking page for duration and title
    const { data: page } = await supabase
      .from('booking_pages')
      .select('duration_minutes, title')
      .eq('id', pageId)
      .single()

    if (!page) {
      return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })
    }

    const { data: staff } = await supabase.from('staff').select('name').eq('id', staffId).single()

    const startTime = new Date(slotTime)
    const endTime = new Date(startTime.getTime() + page.duration_minutes * 60 * 1000)

    // Upsert contact (CRM integration)
    let contactId: string | null = null
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .single()

    if (existingContact) {
      contactId = existingContact.id
      await supabase.from('contacts').update({ updated_at: new Date().toISOString() }).eq('id', contactId)
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({ name, email, phone: phone || null, source: 'booking' })
        .select('id')
        .single()
      contactId = newContact?.id ?? null
    }

    // Create Google Calendar event
    let googleEventId: string | null = null
    let googleMeetLink: string | null = null
    const bookingData = {
      staffId,
      staffName: staff?.name ?? '担当者',
      startTime,
      endTime,
      candidateName: name,
      candidateEmail: email,
      candidatePhone: phone,
      candidateNote: note,
      bookingPageTitle: page.title,
      bookingPageId: pageId,
    }
    try {
      const eventResult = await createCalendarEvent(staffId, bookingData)
      googleEventId = eventResult.eventId
      googleMeetLink = eventResult.meetLink
    } catch (calErr) {
      console.error('Google Calendar error (non-fatal):', calErr)
    }

    // Also create event on admin's calendar if ADMIN_STAFF_ID is set and different from assigned staff
    const adminStaffId = process.env.ADMIN_STAFF_ID
    if (adminStaffId && adminStaffId !== staffId) {
      try {
        await createCalendarEvent(adminStaffId, { ...bookingData, staffId: adminStaffId })
      } catch (adminCalErr) {
        console.error('Admin Google Calendar error (non-fatal):', adminCalErr)
      }
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_page_id: pageId,
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
        status: 'confirmed',
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking insert error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Insert CRM activity
    if (contactId && booking) {
      const jstStart = toZonedTime(startTime, 'Asia/Tokyo')
      const formattedDate = format(jstStart, 'yyyy年M月d日 HH:mm')
      await supabase.from('contact_activities').insert({
        contact_id: contactId,
        activity_type: 'booking',
        title: `面談予約: ${page.title}`,
        description: `${formattedDate} に予約が入りました。担当: ${staff?.name}`,
        booking_id: booking.id,
      })

      // Insert into CRM meetings table
      const jstEnd = toZonedTime(endTime, 'Asia/Tokyo')

      // Look up CRM Customer by email to get their CUID
      const { data: crmCustomer } = await supabase
        .from('Customer')
        .select('id')
        .eq('email', email)
        .single()

      if (crmCustomer) {
        await supabase.from('meetings').insert({
          customerId: crmCustomer.id,
          name: page.title,
          ca: staff?.name ?? '',
          date: startTime.toISOString(),
          startTime: format(jstStart, 'HH:mm'),
          endTime: format(jstEnd, 'HH:mm'),
          method: googleMeetLink ? 'Google Meet' : 'オンライン',
          status: '予定',
          createdAt: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const pageId = searchParams.get('pageId')

    let query = supabase
      .from('bookings')
      .select('*, staff(name), booking_pages(title)')
      .order('start_time', { ascending: false })

    if (pageId) query = query.eq('booking_page_id', pageId)

    const { data: bookings, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ bookings })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
