import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { watchCalendar } from '@/lib/google-calendar'

export async function POST(req: NextRequest) {
  try {
    const { staffId } = await req.json()
    if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 })

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/google/calendar-webhook`
    const watch = await watchCalendar(staffId, webhookUrl)

    const supabase = createServiceClient()
    await supabase.from('staff').update({
      google_channel_id: watch.channelId,
      google_channel_resource_id: watch.resourceId,
      google_channel_expiry: watch.expiration,
      google_channel_last_sync: new Date().toISOString(),
    }).eq('id', staffId)

    return NextResponse.json({ ok: true, expiration: watch.expiration })
  } catch (error: any) {
    console.error('Watch setup error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to setup watch' }, { status: 500 })
  }
}
