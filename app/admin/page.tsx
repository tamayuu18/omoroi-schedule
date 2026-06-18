import { createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createServiceClient()

  const [bookingsResult, totalResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, staff(name), booking_pages(title)')
      .order('start_time', { ascending: true })
      .gte('start_time', new Date().toISOString())
      .limit(10),
    supabase.from('bookings').select('id', { count: 'exact' }),
  ])

  const upcomingBookings = bookingsResult.data ?? []
  const totalCount = totalResult.count ?? 0

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <p className="text-sm text-gray-500">総予約数</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <p className="text-sm text-gray-500">今後の予約</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{upcomingBookings.length}</p>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">今後の予約</h2>
        </div>
        <div className="divide-y">
          {upcomingBookings.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">予約がありません</p>
          ) : (
            upcomingBookings.map((booking: any) => (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{booking.candidate_name}</p>
                  <p className="text-sm text-gray-500">{booking.candidate_email}</p>
                  <p className="text-xs text-gray-400 mt-1">{(booking as any).staff?.name} · {(booking as any).booking_pages?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-indigo-600">
                    {format(new Date(booking.start_time), 'M月d日(E)', { locale: ja })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
