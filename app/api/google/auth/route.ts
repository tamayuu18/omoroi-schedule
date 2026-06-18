import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId')

  if (!staffId) {
    return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
  }

  const url = getAuthUrl(staffId)
  return NextResponse.redirect(url)
}
