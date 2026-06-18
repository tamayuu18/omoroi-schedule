import { createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  confirmed: '確定',
  cancelled: 'キャンセル',
}

export default async function BookingsPage() {
  const supabase = createServiceClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, staff(name), booking_page:booking_pages(title)')
    .order('start_time', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">予約一覧</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {!bookings?.length ? (
          <p className="text-gray-400 text-sm px-6 py-12 text-center">予約はまだありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">日時</th>
                <th className="px-6 py-3 text-left font-medium">求職者</th>
                <th className="px-6 py-3 text-left font-medium">連絡先</th>
                <th className="px-6 py-3 text-left font-medium">担当</th>
                <th className="px-6 py-3 text-left font-medium">ページ</th>
                <th className="px-6 py-3 text-left font-medium">ステータス</th>
                <th className="px-6 py-3 text-left font-medium">Meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(b.start_time), 'M/d(E) HH:mm', { locale: ja })}
                  </td>
                  <td className="px-6 py-4">{b.candidate_name}</td>
                  <td className="px-6 py-4">
                    <div>{b.candidate_email}</div>
                    {b.candidate_phone && (
                      <div className="text-gray-400 text-xs">{b.candidate_phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{b.staff?.name}</td>
                  <td className="px-6 py-4">{b.booking_page?.title}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {b.google_meet_link && (
                      <a
                        href={b.google_meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline text-xs"
                      >
                        参加リンク
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
