import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listUpdatedEvents } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const channelId = req.headers.get('x-goog-channel-id')
  const resourceState = req.headers.get('x-goog-resource-state')

  // sync = initial notification, exists = calendar exists
  if (resourceState === 'sync') {
    return NextResponse.json({ ok: true })
  }

  if (!channelId) {
    return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Find staff by channel ID
    const { data: staff } = await supabase
      .from('staff')
      .select('id, google_channel_last_sync')
      .eq('google_channel_id', channelId)
      .single()

    if (!staff) {
      return NextResponse.json({ ok: true })
    }

    // Get events updated since last sync
    const updatedMin = staff.google_channel_last_sync
      ? staff.google_channel_last_sync
      : new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago

    const events = await listUpdatedEvents(staff.id, updatedMin)

    // Update last sync time
    await supabase
      .from('staff')
      .update({ google_channel_last_sync: new Date().toISOString() })
      .eq('id', staff.id)

    // Find cancelled/deleted events
    const deletedEventIds = events
      .filter((e) => e.status === 'cancelled')
      .map((e) => e.id)
      .filter(Boolean) as string[]

    if (deletedEventIds.length === 0) {
      return NextResponse.json({ ok: true })
    }

    // Cancel matching bookings
    for (const eventId of deletedEventIds) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('google_event_id', eventId)
        .eq('status', 'confirmed')
        .single()

      if (booking) {
        await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', booking.id)
        console.log('Booking cancelled via calendar deletion:', booking.id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Calendar webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
