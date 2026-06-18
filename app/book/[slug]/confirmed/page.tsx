import { createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: { bookingId?: string }
}) {
  const bookingId = searchParams.bookingId
  let booking: any = null

  if (bookingId) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('bookings')
      .select('*, staff(name), booking_page:booking_pages(title)')
      .eq('id', bookingId)
      .single()
    booking = data
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">予約が完了しました</h1>
        <p className="text-gray-500 mb-6">ご予約いただきありがとうございます。</p>

        {booking && (
          <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 space-y-2 text-sm">
            <Row label="面談内容" value={booking.booking_page?.title} />
            <Row label="日時"
              value={format(new Date(booking.start_time), 'yyyy年M月d日(E) HH:mm', { locale: ja }) + '〜'} />
            <Row label="担当者" value={booking.staff?.name} />
            <Row label="お名前" value={booking.candidate_name} />
            <Row label="メール" value={booking.candidate_email} />
            {booking.google_meet_link && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-1">Google Meet</p>
                <a
                  href={booking.google_meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline break-all"
                >
                  {booking.google_meet_link}
                </a>
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-gray-400 mb-6">
          確認メールは別途送付されます。当日はGoogle Meetのリンクからご参加ください。
        </p>

        <Link href="/" className="text-indigo-600 hover:underline text-sm">
          トップページへ戻る
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
