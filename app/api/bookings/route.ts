import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createCalendarEvent, isStaffSlotFree } from '@/lib/google-calendar'
import { notifySlackNewBooking } from '@/lib/slack'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { createClient } from '@supabase/supabase-js'

function createCrmClient() {
  const url = process.env.CRM_SUPABASE_URL
  const key = process.env.CRM_SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pageId, slotTime, staffId, name, email, phone, note } = body

    if (!pageId || !slotTime || !staffId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch booking page for duration and title
    // select('*') にしておくことで、min_notice_hours カラム未追加(マイグレーション未適用)でも
    // エラーにならず、その場合は下で 24 時間にフォールバックする。
    const { data: page } = await supabase
      .from('booking_pages')
      .select('*')
      .eq('id', pageId)
      .single()

    if (!page) {
      return NextResponse.json({ error: 'Booking page not found' }, { status: 404 })
    }

    const { data: staff } = await supabase.from('staff').select('name, email').eq('id', staffId).single()

    const startTime = new Date(slotTime)
    const endTime = new Date(startTime.getTime() + page.duration_minutes * 60 * 1000)

    // --- サーバー側の予約可否チェック ---
    // 一覧表示はあくまで表示時点の空き状況。確定時に改めて検証することで、
    // 「24時間以内の予約」や「ブロック済み時間への予約」が入るのを防ぐ。

    // 1) 最小リードタイム（例: 24時間後以降のみ予約可）
    const minNoticeHours = page.min_notice_hours ?? 24
    const earliestBookable = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000)
    if (startTime < earliestBookable) {
      return NextResponse.json(
        { error: `予約はあと${minNoticeHours}時間以降の枠のみ可能です。` },
        { status: 409 }
      )
    }

    // 2) 既存の確定予約との重複（DB 側・確実）
    const { data: conflicting } = await supabase
      .from('bookings')
      .select('id')
      .eq('staff_id', staffId)
      .eq('status', 'confirmed')
      .lt('start_time', endTime.toISOString())
      .gt('end_time', startTime.toISOString())
      .limit(1)

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json(
        { error: 'この時間帯はすでに予約が入っています。別の時間をお選びください。' },
        { status: 409 }
      )
    }

    // 3) Google カレンダー上のブロック（busy）と重複していないか。
    //    担当スタッフのカレンダーに加え、実際に予定が作成されるカレンダー
    //    （ADMIN_STAFF_ID が設定されていれば管理者カレンダー）も確認する。
    const adminStaffIdForCheck = process.env.ADMIN_STAFF_ID
    const calendarsToCheck = Array.from(
      new Set([staffId, adminStaffIdForCheck].filter(Boolean) as string[])
    )
    const freeResults = await Promise.all(
      calendarsToCheck.map((id) => isStaffSlotFree(id, startTime, endTime))
    )
    if (freeResults.some((free) => !free)) {
      return NextResponse.json(
        { error: 'この時間帯は予約できません。別の時間をお選びください。' },
        { status: 409 }
      )
    }

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
      const { data: newContact, error: contactInsertError } = await supabase
        .from('contacts')
        .insert({ name, email, phone: phone || null, source: 'booking' })
        .select('id')
        .single()
      contactId = newContact?.id ?? null
    }

    // Pre-generate the booking id and cancellation token so the cancel URL
    // can be embedded in the calendar invite (delivered to the candidate).
    const bookingId = crypto.randomUUID()
    const cancellationToken = crypto.randomUUID()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const cancelUrl = appUrl
      ? `${appUrl}/book/${page.slug}/cancel?id=${bookingId}&token=${cancellationToken}`
      : undefined

    // Create Google Calendar event
    let googleEventId: string | null = null
    let googleMeetLink: string | null = null
    const bookingData = {
      staffId,
      staffName: staff?.name ?? '担当者',
      staffEmail: staff?.email ?? undefined,
      startTime,
      endTime,
      candidateName: name,
      candidateEmail: email,
      candidatePhone: phone,
      candidateNote: note,
      bookingPageTitle: page.title,
      bookingPageId: pageId,
      cancelUrl,
    }

    // Create calendar event: use admin account if set (single source of Meet URL),
    // otherwise fall back to assigned staff's account
    const adminStaffId = process.env.ADMIN_STAFF_ID
    const calendarCreatorId = adminStaffId ?? staffId
    try {
      const eventResult = await createCalendarEvent(calendarCreatorId, bookingData)
      googleEventId = eventResult.eventId
      googleMeetLink = eventResult.meetLink
    } catch (calErr) {
      console.error('Google Calendar error (non-fatal):', calErr)
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
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
        cancellation_token: cancellationToken,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking insert error:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Slack notification
    if (booking) {
      const jstStartSlack = toZonedTime(startTime, 'Asia/Tokyo')
      await notifySlackNewBooking({
        candidateName: name,
        candidateEmail: email,
        candidatePhone: phone,
        staffName: staff?.name ?? '担当者',
        pageTitle: page.title,
        startTimeJst: format(jstStartSlack, 'yyyy年M月d日 HH:mm'),
        meetLink: googleMeetLink,
      })
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

      const crmSupabase = createCrmClient()
      if (crmSupabase) {
        // Look up CRM Customer by email, create if not found
        let crmCustomerId: string | null = null
        const { data: crmCustomer, error: crmLookupError } = await crmSupabase
          .from('Customer')
          .select('id')
          .eq('email', email)
          .single()

        if (crmCustomer) {
          crmCustomerId = crmCustomer.id
        } else {
          const now = new Date().toISOString()
          const newId = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
          const { data: newCustomer } = await crmSupabase
            .from('Customer')
            .insert({
              id: newId,
              name,
              email,
              phone: phone || null,
              ca: staff?.name ?? '',
              status: '面談予約済み',
              inflow: 'omoroi-schedule',
              registeredAt: now,
              updatedAt: now,
            })
            .select('id')
            .single()
          crmCustomerId = newCustomer?.id ?? null
        }

        if (crmCustomerId) {
          const meetingId = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
          const { error: meetingError } = await crmSupabase.from('Meeting').insert({
            id: meetingId,
            customerId: crmCustomerId,
            name: page.title,
            ca: staff?.name ?? '',
            date: startTime.toISOString(),
            startTime: format(jstStart, 'HH:mm'),
            endTime: format(jstEnd, 'HH:mm'),
            method: googleMeetLink ? 'Google Meet' : 'オンライン',
            status: '予定',
            createdAt: new Date().toISOString(),
          })
          if (meetingError) console.error('Meeting insert error:', meetingError.message)
        }
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
