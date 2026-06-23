import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'
import { getOAuthClient, getStaffBusyIntervals } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId')
  // ?date=YYYY-MM-DD を付けると、その日(JST 0:00〜翌0:00)にシステムが「埋まっている」と
  // 判定する時間帯一覧を返す。ブロックが検出されているか確認するのに使う。
  const dateStr = searchParams.get('date')
  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: staff, error } = await supabase.from('staff').select('*').eq('id', staffId).single()

  if (error || !staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

  const info: Record<string, unknown> = {
    name: staff.name,
    email: staff.email,
    has_refresh_token: !!staff.google_refresh_token,
    has_access_token: !!staff.google_access_token,
    token_expiry: staff.google_token_expiry,
    calendar_id: staff.google_calendar_id,
  }

  if (!staff.google_refresh_token) {
    return NextResponse.json({ ...info, status: 'no_token' })
  }

  try {
    const oauth2Client = getOAuthClient()
    oauth2Client.setCredentials({
      access_token: staff.google_access_token,
      refresh_token: staff.google_refresh_token,
      expiry_date: staff.google_token_expiry ? new Date(staff.google_token_expiry).getTime() : undefined,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarId = staff.google_calendar_id || 'primary'

    // Test: list next 1 event
    const eventsResp = await calendar.events.list({
      calendarId,
      maxResults: 1,
      singleEvents: true,
    })

    // date 指定時は、その日に検出される busy 区間（＝予約をブロックする時間帯）を返す
    let busyForDate: unknown = undefined
    if (dateStr) {
      const dayStart = new Date(`${dateStr}T00:00:00+09:00`)
      const dayEnd = new Date(`${dateStr}T24:00:00+09:00`)
      const { busy } = await getStaffBusyIntervals(staffId, dayStart, dayEnd)
      busyForDate = {
        date: dateStr,
        checked_calendar_id: calendarId,
        busy_count: busy.length,
        busy: busy.map((b) => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
      }
    }

    return NextResponse.json({
      ...info,
      status: 'ok',
      calendar_accessible: true,
      events_count: eventsResp.data.items?.length ?? 0,
      ...(busyForDate ? { busy_for_date: busyForDate } : {}),
    })
  } catch (err: unknown) {
    return NextResponse.json({
      ...info,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
