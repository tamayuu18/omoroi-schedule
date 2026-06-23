import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')

    if (slug) {
      const { data: page, error } = await supabase
        .from('booking_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error || !page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ page })
    }

    const { data: pages, error } = await supabase
      .from('booking_pages')
      .select('*, booking_page_staff(staff(id, name))')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Flatten staff
    const pagesWithStaff = (pages ?? []).map((p: any) => ({
      ...p,
      staff: (p.booking_page_staff ?? []).map((bps: any) => bps.staff).filter(Boolean),
    }))

    return NextResponse.json({ pages: pagesWithStaff })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await req.json()
    const { title, slug, description, duration_minutes, staffIds, buffer_minutes, available_start_hour, available_end_hour, min_notice_hours } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
    }

    const { data: page, error } = await supabase
      .from('booking_pages')
      .insert({
        title,
        slug,
        description: description || null,
        duration_minutes: duration_minutes || 30,
        buffer_minutes: buffer_minutes ?? 15,
        available_start_hour: available_start_hour ?? 9,
        available_end_hour: available_end_hour ?? 18,
        min_notice_hours: min_notice_hours ?? 24,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (staffIds && staffIds.length > 0) {
      await supabase.from('booking_page_staff').insert(
        staffIds.map((staffId: string) => ({ booking_page_id: page.id, staff_id: staffId }))
      )
    }

    return NextResponse.json({ page })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
