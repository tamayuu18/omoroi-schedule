import { createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createServiceClient()

  const [{ data: bookings }, { count: totalCount }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, staff(name), booking_page:booking_pages(title)')
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">総予約数</p>
          <p className="text-3xl font-bold text-indigo-700 mt-1">{totalCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">直近の予約</p>
          <p className="text-3xl font-bold text-indigo-700 mt-1">{bookings?.length ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold">直近の予約</h2>
        </div>
        {!bookings?.length ? (
          <p className="text-gray-400 text-sm px-6 py-8 text-center">予約はまだありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">日時</th>
                <th className="px-6 py-3 text-left font-medium">求職者</th>
                <th className="px-6 py-3 text-left font-medium">担当</th>
                <th className="px-6 py-3 text-left font-medium">予約ページ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {format(new Date(b.start_time), 'M/d(E) HH:mm', { locale: ja })}
                  </td>
                  <td className="px-6 py-4">
                    <div>{b.candidate_name}</div>
                    <div className="text-gray-400 text-xs">{b.candidate_email}</div>
                  </td>
                  <td className="px-6 py-4">{b.staff?.name}</td>
                  <td className="px-6 py-4">{b.booking_page?.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
