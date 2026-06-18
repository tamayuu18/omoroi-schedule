import { google } from 'googleapis'
import { createServiceClient } from './supabase/server'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
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

async function getAuthenticatedClient(staffId: string) {
  const supabase = createServiceClient()
  const { data: staff } = await supabase
    .from('staff')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', staffId)
    .single()

  if (!staff?.google_refresh_token) {
    throw new Error(`Staff ${staffId} has no Google Calendar connected`)
  }

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: staff.google_access_token,
    refresh_token: staff.google_refresh_token,
    expiry_date: staff.google_token_expiry
      ? new Date(staff.google_token_expiry).getTime()
      : undefined,
  })

  // Auto-refresh and save new token
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from('staff')
        .update({
          google_access_token: tokens.access_token,
          google_token_expiry: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
        })
        .eq('id', staffId)
    }
  })

  return oauth2Client
}

export async function getAvailableSlots(
  staffList: Array<{ id: string; name: string; google_calendar_id: string }>,
  date: Date,
  durationMinutes: number,
  startHour: number,
  endHour: number
): Promise<Array<{ time: string; staffId: string; staffName: string }>> {
  const TZ = 'Asia/Tokyo'

  // Build time range for the day
  const dayStart = new Date(date)
  dayStart.setHours(startHour, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(endHour, 0, 0, 0)

  // Gather busy intervals per staff
  const busyByStaff = new Map<string, Array<{ start: Date; end: Date }>>()

  await Promise.all(
    staffList.map(async (staff) => {
      try {
        const auth = await getAuthenticatedClient(staff.id)
        const calendar = google.calendar({ version: 'v3', auth })

        const freebusyRes = await calendar.freebusy.query({
          requestBody: {
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            timeZone: TZ,
            items: [{ id: staff.google_calendar_id || 'primary' }],
          },
        })

        const busy =
          freebusyRes.data.calendars?.[staff.google_calendar_id || 'primary']
            ?.busy || []

        busyByStaff.set(
          staff.id,
          busy.map((b) => ({
            start: new Date(b.start!),
            end: new Date(b.end!),
          }))
        )
      } catch {
        // Staff not connected - treat as fully busy (no slots)
        busyByStaff.set(staff.id, [
          { start: new Date(dayStart), end: new Date(dayEnd) },
        ])
      }
    })
  )

  // Generate slots
  const slots: Array<{ time: string; staffId: string; staffName: string }> = []
  const slotMs = durationMinutes * 60 * 1000
  const now = new Date()

  for (
    let slotStart = new Date(dayStart);
    slotStart.getTime() + slotMs <= dayEnd.getTime();
    slotStart = new Date(slotStart.getTime() + slotMs)
  ) {
    if (slotStart <= now) continue

    const slotEnd = new Date(slotStart.getTime() + slotMs)

    // Find first available staff for this slot
    for (const staff of staffList) {
      const busy = busyByStaff.get(staff.id) || []
      const isAvailable = !busy.some(
        (b) => b.start < slotEnd && b.end > slotStart
      )

      if (isAvailable) {
        slots.push({
          time: slotStart.toISOString(),
          staffId: staff.id,
          staffName: staff.name,
        })
        break // One staff per slot is enough
      }
    }
  }

  return slots
}

export async function createCalendarEvent(
  staffId: string,
  calendarId: string,
  booking: {
    title: string
    startTime: string
    endTime: string
    candidateName: string
    candidateEmail: string
    note?: string
  }
): Promise<{ eventId: string; meetLink: string | null }> {
  const auth = await getAuthenticatedClient(staffId)
  const calendar = google.calendar({ version: 'v3', auth })

  const event = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: booking.title,
      description: booking.note || '',
      start: {
        dateTime: booking.startTime,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: booking.endTime,
        timeZone: 'Asia/Tokyo',
      },
      attendees: [{ email: booking.candidateEmail, displayName: booking.candidateName }],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  return {
    eventId: event.data.id!,
    meetLink: event.data.conferenceData?.entryPoints?.[0]?.uri || null,
  }
}
