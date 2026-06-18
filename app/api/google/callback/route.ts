import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/google-calendar'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const staffId = searchParams.get('state')

  if (!code || !staffId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/staff?error=missing_params`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const supabase = createServiceClient()

    await supabase.from('staff').update({
      google_access_token: tokens.access_token ?? null,
      google_refresh_token: tokens.refresh_token ?? null,
      google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    }).eq('id', staffId)

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/staff?success=true`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/staff?error=oauth_failed`)
  }
}
