import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const supabase = createServiceClient()

  if (slug) {
    const { data: page, error } = await supabase
      .from('booking_pages')
      .select('*, booking_page_staff(staff(id, name))')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    if (error || !page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ page })
  }

  const { data: pages, error } = await supabase
    .from('booking_pages')
    .select('*, booking_page_staff(staff(id, name))')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pages })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    title, slug, description, duration_minutes = 30,
    buffer_minutes = 15, max_days_ahead = 30,
    available_start_hour = 9, available_end_hour = 18,
    available_days = [1, 2, 3, 4, 5],
    staffIds = [],
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: page, error } = await supabase
    .from('booking_pages')
    .insert({
      title, slug, description, duration_minutes, buffer_minutes,
      max_days_ahead, available_start_hour, available_end_hour, available_days,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (staffIds.length > 0) {
    await supabase.from('booking_page_staff').insert(
      staffIds.map((sid: string) => ({ booking_page_id: page.id, staff_id: sid }))
    )
  }

  return NextResponse.json({ page }, { status: 201 })
}
