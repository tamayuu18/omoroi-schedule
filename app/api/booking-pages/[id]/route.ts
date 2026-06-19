import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient()
    const body = await req.json()
    const { title, slug, description, duration_minutes, staffIds, buffer_minutes, available_start_hour, available_end_hour } = body
    const { id } = await params

    const { error } = await supabase
      .from('booking_pages')
      .update({
        title,
        slug,
        description: description || null,
        duration_minutes,
        buffer_minutes: buffer_minutes ?? 15,
        available_start_hour: available_start_hour ?? 9,
        available_end_hour: available_end_hour ?? 18,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update staff associations
    await supabase.from('booking_page_staff').delete().eq('booking_page_id', id)
    if (staffIds && staffIds.length > 0) {
      await supabase.from('booking_page_staff').insert(
        staffIds.map((staffId: string) => ({ booking_page_id: id, staff_id: staffId }))
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient()
    const { id } = await params
    const { error } = await supabase.from('booking_pages').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
