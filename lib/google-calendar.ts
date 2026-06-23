import { google } from 'googleapis'
import { createServiceClient } from './supabase/server'
import type { BookingData } from './types'

const SCOPES = ['https://www.googleapis.com/auth/calendar']
const JST = 'Asia/Tokyo'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  )
}

export function getAuthUrl(staffId: string): string {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: staffId,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

async function getAuthClientForStaff(staffId: string) {
  const supabase = createServiceClient()
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()

  if (error || !staff) throw new Error(`Staff not found: ${staffId}`)
  if (!staff.google_refresh_token) throw new Error(`Staff ${staffId} has no Google token`)

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: staff.google_access_token,
    refresh_token: staff.google_refresh_token,
    expiry_date: staff.google_token_expiry ? new Date(staff.google_token_expiry).getTime() : undefined,
  })

  oauth2Client.on('tokens', async (tokens) => {
    const updates: Record<string, string | null> = {}
    if (tokens.access_token) updates.google_access_token = tokens.access_token
    if (tokens.expiry_date) updates.google_token_expiry = new Date(tokens.expiry_date).toISOString()
    if (Object.keys(updates).length > 0) {
      await supabase.from('staff').update(updates).eq('id', staffId)
    }
  })

  return { oauth2Client, calendarId: staff.google_calendar_id || 'primary' }
}

export interface AvailableSlot {
  time: Date
  staffId: string
  staffName: string
}

/**
 * 指定カレンダーの [timeMin, timeMax) 区間にある「埋まっている」時間帯を返す。
 *
 * freebusy API ではなく events.list を使う理由:
 *   freebusy は「予定なし(Free)」表示や終日予定をビジーとして返さないため、
 *   スタッフが終日でブロックした予定などがすり抜けてしまう。events.list なら
 *   全予定を取得できるので、終日・Free 表示のブロックも確実に除外できる。
 *
 * 除外するもの: キャンセル済み予定、本人が「不参加」と回答した予定。
 */
async function getBusyIntervals(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const resp = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  })

  const intervals: Array<{ start: Date; end: Date }> = []
  for (const ev of resp.data.items ?? []) {
    if (ev.status === 'cancelled') continue
    // 本人が「不参加」と回答している予定は空き扱い
    const self = ev.attendees?.find((a) => a.self)
    if (self?.responseStatus === 'declined') continue

    let start: Date | null = null
    let end: Date | null = null
    if (ev.start?.dateTime) start = new Date(ev.start.dateTime)
    else if (ev.start?.date) start = new Date(`${ev.start.date}T00:00:00+09:00`)
    if (ev.end?.dateTime) end = new Date(ev.end.dateTime)
    else if (ev.end?.date) end = new Date(`${ev.end.date}T00:00:00+09:00`) // 終日の end.date は排他的＝そのままで終端

    if (start && end) intervals.push({ start, end })
  }
  return intervals
}

/**
 * スタッフが「編集権限を持つ」全カレンダーの ID を返す。
 *
 * primary だけを見ていると、別カレンダー（共有/チームカレンダー等）に入れた
 * ブロックがすり抜ける。owner/writer のカレンダーを全て対象にすることで、
 * 本人が管理しているカレンダー上のブロックを確実に拾う。
 * 祝日・誕生日などの購読系(accessRole=reader)はノイズになるため除外する。
 */
async function getCalendarIdsToCheck(
  calendar: ReturnType<typeof google.calendar>,
  configuredCalendarId: string
): Promise<string[]> {
  const ids = new Set<string>()
  if (configuredCalendarId) ids.add(configuredCalendarId)
  try {
    const list = await calendar.calendarList.list({ maxResults: 250, showHidden: true })
    for (const cal of list.data.items ?? []) {
      if (!cal.id) continue
      if (cal.accessRole === 'owner' || cal.accessRole === 'writer') ids.add(cal.id)
    }
  } catch (e) {
    console.error('getCalendarIdsToCheck: calendarList.list failed:', e)
  }
  return Array.from(ids)
}

/**
 * 指定スタッフが編集権限を持つ全カレンダーを横断して busy 区間を取得する。
 * デバッグ用途のため、実際にチェックしたカレンダー ID 一覧も返す。
 */
export async function getStaffBusyIntervals(
  staffId: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ calendarIds: string[]; busy: Array<{ start: Date; end: Date }> }> {
  const { oauth2Client, calendarId } = await getAuthClientForStaff(staffId)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const calendarIds = await getCalendarIdsToCheck(calendar, calendarId)

  const busy: Array<{ start: Date; end: Date }> = []
  for (const id of calendarIds) {
    try {
      busy.push(...(await getBusyIntervals(calendar, id, timeMin, timeMax)))
    } catch (e) {
      console.error(`getStaffBusyIntervals: getBusyIntervals failed for calendar ${id}:`, e)
    }
  }
  return { calendarIds, busy }
}

export async function getAvailableSlots(
  staffList: Array<{ id: string; name: string; google_refresh_token: string | null; google_calendar_id: string }>,
  date: Date,
  durationMinutes: number,
  bufferMinutes: number,
  startHour: number,
  endHour: number,
  minNoticeHours: number = 24,
  adminStaffId?: string
): Promise<AvailableSlot[]> {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const dayStart = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00+09:00`)
  const dayEnd = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:00:00+09:00`)

  // 「今から minNoticeHours 時間後」以降のスロットのみ予約可能にする。
  const earliestBookable = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000)

  const staffBusyMap: Record<string, Array<{ start: Date; end: Date }>> = {}

  await Promise.all(
    staffList
      .filter((s) => s.google_refresh_token)
      .map(async (staff) => {
        try {
          const { busy } = await getStaffBusyIntervals(staff.id, dayStart, dayEnd)
          staffBusyMap[staff.id] = busy
        } catch (e) {
          // 取得失敗時に空き扱いするとブロックがすり抜けるため、ログを必ず残す
          console.error(`getAvailableSlots: failed to load calendar for staff ${staff.id}:`, e)
          staffBusyMap[staff.id] = []
        }
      })
  )

  // 予約イベントは ADMIN_STAFF_ID が設定されていると全て管理者カレンダーに作成される。
  // そのため、管理者カレンダーが埋まっている時間はどのスタッフでも予約不可。
  // 管理者カレンダーの busy を全スタッフの busy に合算する。
  if (adminStaffId) {
    try {
      const { busy: adminBusy } = await getStaffBusyIntervals(adminStaffId, dayStart, dayEnd)
      for (const staff of staffList) {
        if (!staffBusyMap[staff.id]) staffBusyMap[staff.id] = []
        staffBusyMap[staff.id].push(...adminBusy)
      }
    } catch (e) {
      console.error(`getAvailableSlots: failed to load admin calendar ${adminStaffId}:`, e)
    }
  }

  const supabase = createServiceClient()
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('staff_id, start_time, end_time')
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString())
    .eq('status', 'confirmed')

  for (const booking of existingBookings ?? []) {
    const staffId = booking.staff_id
    if (!staffBusyMap[staffId]) staffBusyMap[staffId] = []
    staffBusyMap[staffId].push({
      start: new Date(booking.start_time),
      end: new Date(booking.end_time),
    })
  }

  // Load total confirmed booking counts per staff for even distribution
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('staff_id')
    .eq('status', 'confirmed')

  const bookingCounts: Record<string, number> = {}
  for (const staff of staffList) bookingCounts[staff.id] = 0
  for (const b of allBookings ?? []) {
    if (bookingCounts[b.staff_id] !== undefined) bookingCounts[b.staff_id]++
  }

  // Track assignments made within this slot generation to keep balance
  const assignedThisRun: Record<string, number> = {}
  for (const staff of staffList) assignedThisRun[staff.id] = 0

  const slots: AvailableSlot[] = []
  const slotTime = new Date(dayStart)

  while (slotTime < dayEnd) {
    const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60 * 1000)
    if (slotEnd > dayEnd) break

    // 最小リードタイムより前のスロットはスキップ（例: 24時間以内の予約は不可）
    if (slotTime < earliestBookable) {
      slotTime.setMinutes(slotTime.getMinutes() + durationMinutes + bufferMinutes)
      continue
    }

    // Find available staff, then pick the one with fewest total bookings (even distribution)
    const availableStaff = staffList
      .filter((s) => s.google_refresh_token)
      .filter((staff) => {
        const busy = staffBusyMap[staff.id] ?? []
        return !busy.some((b) => slotTime < b.end && slotEnd > b.start)
      })

    if (availableStaff.length > 0) {
      availableStaff.sort((a, b) => {
        const loadA = (bookingCounts[a.id] ?? 0) + (assignedThisRun[a.id] ?? 0)
        const loadB = (bookingCounts[b.id] ?? 0) + (assignedThisRun[b.id] ?? 0)
        return loadA - loadB
      })
      const chosen = availableStaff[0]
      slots.push({ time: new Date(slotTime), staffId: chosen.id, staffName: chosen.name })
      assignedThisRun[chosen.id] = (assignedThisRun[chosen.id] ?? 0) + 1
    }

    slotTime.setMinutes(slotTime.getMinutes() + durationMinutes + bufferMinutes)
  }

  return slots
}

/**
 * 予約確定時にスタッフのカレンダーが指定スロットで本当に空いているか再確認する。
 * 一覧表示後にスタッフがカレンダーをブロックした場合や、二重予約・古い画面からの
 * 送信などで、ブロック済みの時間に予約が入ってしまうのを防ぐ。
 *
 * カレンダーへアクセスできない（トークン切れ等）場合は true を返し既存挙動を維持する。
 * DB 側の確定予約チェックは別途呼び出し側で行う。
 */
export async function isStaffSlotFree(staffId: string, start: Date, end: Date): Promise<boolean> {
  try {
    const { busy } = await getStaffBusyIntervals(staffId, start, end)
    return !busy.some((b) => start < b.end && end > b.start)
  } catch (e) {
    // カレンダー照会に失敗した場合はブロックせず通す（DB 側チェックで二重予約は防ぐ）。
    // ただし静かに通すとブロックすり抜けに気づけないため必ずログを残す。
    console.error(`isStaffSlotFree: failed to check calendar for staff ${staffId}:`, e)
    return true
  }
}

export async function deleteCalendarEvent(staffId: string, eventId: string) {
  const { oauth2Client, calendarId } = await getAuthClientForStaff(staffId)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  try {
    await calendar.events.delete({ calendarId, eventId })
  } catch (e: any) {
    if (e?.code !== 410 && e?.code !== 404) throw e
  }
}

export async function watchCalendar(staffId: string, webhookUrl: string) {
  const { oauth2Client, calendarId } = await getAuthClientForStaff(staffId)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const channelId = crypto.randomUUID()
  const res = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
    },
  })
  return {
    channelId,
    resourceId: res.data.resourceId ?? '',
    expiration: res.data.expiration ? new Date(parseInt(res.data.expiration)).toISOString() : null,
    calendarId,
  }
}

export async function stopWatchCalendar(channelId: string, resourceId: string) {
  const oauth2Client = getOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  try {
    await calendar.channels.stop({ requestBody: { id: channelId, resourceId } })
  } catch {
    // ignore
  }
}

export async function listUpdatedEvents(staffId: string, updatedMin: string) {
  const { oauth2Client, calendarId } = await getAuthClientForStaff(staffId)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const res = await calendar.events.list({
    calendarId,
    updatedMin,
    showDeleted: true,
    singleEvents: true,
    maxResults: 100,
  })
  return res.data.items ?? []
}

export async function createCalendarEvent(staffId: string, booking: BookingData) {
  const { oauth2Client, calendarId } = await getAuthClientForStaff(staffId)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: `${booking.staffName} 面談: ${booking.candidateName}様`,
      description: `${booking.bookingPageTitle}\n\n求職者: ${booking.candidateName}\nEmail: ${booking.candidateEmail}${booking.candidatePhone ? `\n電話: ${booking.candidatePhone}` : ''}${booking.candidateNote ? `\n備考: ${booking.candidateNote}` : ''}`,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: JST,
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: JST,
      },
      attendees: [
        { email: booking.candidateEmail, displayName: booking.candidateName },
        ...(booking.staffEmail ? [{ email: booking.staffEmail, displayName: booking.staffName }] : []),
        ...(process.env.ADMIN_EMAIL ? [{ email: process.env.ADMIN_EMAIL }] : []),
      ],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  return {
    eventId: event.data.id ?? null,
    meetLink: event.data.conferenceData?.entryPoints?.[0]?.uri ?? null,
  }
}
