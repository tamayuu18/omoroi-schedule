'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Booking {
  id: string
  candidate_name: string
  candidate_email: string
  start_time: string
  end_time: string
  status: string
  google_meet_link: string | null
  staff?: { name: string }
  booking_pages?: { title: string }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function loadBookings() {
    setLoading(true)
    const res = await fetch('/api/bookings')
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      setBookings(data.bookings ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadBookings() }, [])

  async function handleCancel(id: string) {
    if (!confirm('この予約をキャンセルしますか？')) return
    setCancelling(id)
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setCancelling(null)
    await loadBookings()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">予約一覧</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          エラー: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">読み込み中...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">求職者</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">日時</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">担当者</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">予約ページ</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ステータス</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Meet</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{booking.candidate_name}</p>
                    <p className="text-xs text-gray-500">{booking.candidate_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {booking.start_time
                      ? format(new Date(booking.start_time), 'M月d日(E) HH:mm', { locale: ja })
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{booking.staff?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{booking.booking_pages?.title ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status === 'confirmed' ? '確認済み' : booking.status === 'cancelled' ? 'キャンセル' : booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {booking.google_meet_link ? (
                      <a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline">参加</a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {booking.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelling === booking.id}
                        className="text-xs border border-red-200 px-3 py-1 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                      >
                        {cancelling === booking.id ? '処理中...' : 'キャンセル'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <p className="p-6 text-gray-500 text-sm text-center">予約がありません</p>
          )}
        </div>
      )}
    </div>
  )
}
