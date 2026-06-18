import { createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const supabase = createServiceClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, staff(name), booking_pages(title)')
    .order('start_time', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">予約一覧</h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">求職者</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">日時</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">担当者</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">予約ページ</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">ステータス</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Meet</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(bookings ?? []).map((booking: any) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{booking.candidate_name}</p>
                  <p className="text-xs text-gray-500">{booking.candidate_email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {format(new Date(booking.start_time), 'M月d日(E) HH:mm', { locale: ja })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{booking.staff?.name ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{booking.booking_pages?.title ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status === 'confirmed' ? '確認済み' : booking.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {booking.google_meet_link ? (
                    <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline">参加</a>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!bookings || bookings.length === 0) && (
          <p className="p-6 text-gray-500 text-sm text-center">予約がありません</p>
        )}
      </div>
    </div>
  )
}
