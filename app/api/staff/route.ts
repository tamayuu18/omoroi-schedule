import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ staff })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { name, email } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .insert({ name, email })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ staff })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
