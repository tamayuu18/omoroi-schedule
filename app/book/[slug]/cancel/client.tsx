'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'

interface CancelBooking {
  id: string
  candidate_name: string
  start_time: string
  status: string
  staff_name: string | null
  page_title: string | null
}

export default function CancelClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const token = searchParams.get('token') ?? ''

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<CancelBooking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!id || !token) {
      setError('キャンセルに必要な情報が不足しています')
      setLoading(false)
      return
    }
    fetch(`/api/bookings/cancel?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error)
        } else {
          setBooking(d.booking)
          if (d.booking?.status === 'cancelled') setDone(true)
        }
      })
      .catch(() => setError('予約情報の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [id, token])

  async function handleCancel() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error ?? 'キャンセルに失敗しました')
      }
    } catch {
      setError('キャンセルに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const time = booking?.start_time ? new Date(booking.start_time) : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          {loading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : error && !booking ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">エラー</h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Link
                href={`/book/${slug}`}
                className="block w-full border py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                予約ページへ
              </Link>
            </>
          ) : done ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">予約をキャンセルしました</h1>
              <p className="text-gray-500 mb-6">またのご予約をお待ちしております</p>
              <Link
                href={`/book/${slug}`}
                className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                予約ページへ
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">予約をキャンセルしますか？</h1>
              <p className="text-gray-500 mb-6">以下の予約をキャンセルします。この操作は取り消せません。</p>

              <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">お名前</span>
                  <span className="font-medium text-gray-900">{booking?.candidate_name}</span>
                </div>
                {time && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">日時</span>
                    <span className="font-medium text-gray-900">
                      {format(time, 'M月d日(E) HH:mm', { locale: ja })}
                    </span>
                  </div>
                )}
                {booking?.staff_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">担当</span>
                    <span className="font-medium text-gray-900">{booking.staff_name}</span>
                  </div>
                )}
                {booking?.page_title && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">予約ページ</span>
                    <span className="font-medium text-gray-900">{booking.page_title}</span>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

              <div className="space-y-3">
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="block w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? '処理中...' : '予約をキャンセルする'}
                </button>
                <Link
                  href={`/book/${slug}`}
                  className="block w-full border py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  やめる
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
