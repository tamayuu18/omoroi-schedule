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

  // Auto-refresh and save updated token
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

export async function getAvailableSlots(
  staffList: Array<{ id: string; name: string; google_refresh_token: string | null; google_calendar_id: string }>,
  date: Date,
  durationMinutes: number,
  bufferMinutes: number,
  startHour: number,
  endHour: number
): Promise<AvailableSlot[]> {
  // Build time range for the day in JST (date string like "2026-06-20")
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const dayStart = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00+09:00`)
  const dayEnd = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:00:00+09:00`)

  // Fetch busy intervals for each staff
  const staffBusyMap: Record<string, Array<{ start: Date; end: Date }>> = {}

  await Promise.all(
    staffList
      .filter((s) => s.google_refresh_token)
      .map(async (staff) => {
        try {
          const { oauth2Client, calendarId } = await getAuthClientForStaff(staff.id)
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
          const freeBusyResp = await calendar.freebusy.query({
            requestBody: {
              timeMin: dayStart.toISOString(),
              timeMax: dayEnd.toISOString(),
              timeZone: JST,
              items: [{ id: calendarId }],
            },
          })
          const busy = freeBusyResp.data.calendars?.[calendarId]?.busy ?? []
          staffBusyMap[staff.id] = busy.map((b) => ({
            start: new Date(b.start!),
            end: new Date(b.end!),
          }))
        } catch {
          staffBusyMap[staff.id] = []
        }
      })
  )

  // Also fetch existing DB bookings to mark as busy
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

  // Generate slots
  const slots: AvailableSlot[] = []
  const slotTime = new Date(dayStart)

  while (slotTime < dayEnd) {
    const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60 * 1000)
    if (slotEnd > dayEnd) break

    // Find first available staff for this slot
    for (const staff of staffList.filter((s) => s.google_refresh_token)) {
      const busy = staffBusyMap[staff.id] ?? []
      const isBusy = busy.some(
        (b) => slotTime < b.end && slotEnd > b.start
      )
      if (!isBusy) {
        slots.push({ time: new Date(slotTime), staffId: staff.id, staffName: staff.name })
        break
      }
    }

    slotTime.setMinutes(slotTime.getMinutes() + durationMinutes + bufferMinutes)
  }

  return slots
}

export async function deleteCalendarEvent(staffId: string, eventId: string) {
  const { oauth2Client, calendarId } = await getAuthClientForStaff(staffId)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  try {
    await calendar.events.delete({ calendarId, eventId })
  } catch (e: any) {
    if (e?.code !== 410 && e?.code !== 404) throw e
    // 410/404 means already deleted - that's fine
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
  // Use any staff's oauth client - we just need to call channels.stop
  const oauth2Client = getOAuthClient()
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  try {
    await calendar.channels.stop({ requestBody: { id: channelId, resourceId } })
  } catch {
    // ignore errors
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
