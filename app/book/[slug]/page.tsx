'use client'

import { useEffect, useState } from 'react'
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useParams, useRouter } from 'next/navigation'

interface TimeSlot { time: string; staffId: string; staffName: string }
interface PageInfo { title: string; description: string | null; duration_minutes: number; max_days_ahead: number }

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [calendarOffset, setCalendarOffset] = useState(0) // weeks offset
  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/booking-pages?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setPageInfo(d.page))
  }, [slug])

  useEffect(() => {
    if (!selectedDate) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    fetch(`/api/availability?slug=${slug}&date=${dateStr}`)
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots || []); setLoadingSlots(false) })
  }, [selectedDate, slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          staffId: selectedSlot.staffId,
          slotTime: selectedSlot.time,
          name: form.name,
          email: form.email,
          phone: form.phone,
          note: form.note,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '予約に失敗しました')
      router.push(`/book/${slug}/confirmed?bookingId=${data.booking.id}`)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  // Build 2-week calendar
  const today = startOfDay(new Date())
  const maxDays = pageInfo?.max_days_ahead || 30
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(today, calendarOffset * 14 + i))
    .filter((d) => d <= addDays(today, maxDays))

  const amSlots = slots.filter((s) => new Date(s.time).getHours() < 12)
  const pmSlots = slots.filter((s) => new Date(s.time).getHours() >= 12)

  if (!pageInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{pageInfo.title}</h1>
          {pageInfo.description && (
            <p className="text-gray-500 mt-2">{pageInfo.description}</p>
          )}
          <p className="text-sm text-indigo-600 mt-3 font-medium">
            面談時間: {pageInfo.duration_minutes}分
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calendar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">日付を選択</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalendarOffset((p) => Math.max(0, p - 1))}
                  disabled={calendarOffset === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCalendarOffset((p) => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
              {DAYS.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Padding for first week */}
              {calendarOffset === 0 && Array.from({ length: today.getDay() }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {calendarDays.map((day) => {
                const dow = day.getDay()
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isWeekend = dow === 0 || dow === 6
                const isPast = day < today
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !isPast && setSelectedDate(day)}
                    disabled={isPast || isWeekend}
                    className={`aspect-square rounded-full text-sm font-medium transition flex items-center justify-center
                      ${isSelected ? 'bg-indigo-600 text-white' : ''}
                      ${!isSelected && isToday(day) ? 'border-2 border-indigo-400 text-indigo-600' : ''}
                      ${!isSelected && !isPast && !isWeekend ? 'hover:bg-indigo-50 text-gray-800 cursor-pointer' : ''}
                      ${(isPast || isWeekend) ? 'text-gray-300 cursor-not-allowed' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              {selectedDate
                ? format(selectedDate, 'M月d日(E)', { locale: ja }) + ' の空き時間'
                : '日付を選択してください'}
            </h2>
            {selectedDate && (
              loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !slots.length ? (
                <p className="text-gray-400 text-sm text-center py-8">この日に空き時間はありません</p>
              ) : (
                <div className="space-y-4">
                  {amSlots.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-2">午前</p>
                      <div className="grid grid-cols-2 gap-2">
                        {amSlots.map((slot) => (
                          <SlotButton key={slot.time} slot={slot} selected={selectedSlot?.time === slot.time}
                            onClick={() => setSelectedSlot(slot)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {pmSlots.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-2">午後</p>
                      <div className="grid grid-cols-2 gap-2">
                        {pmSlots.map((slot) => (
                          <SlotButton key={slot.time} slot={slot} selected={selectedSlot?.time === slot.time}
                            onClick={() => setSelectedSlot(slot)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Booking form */}
        {selectedSlot && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-6">
            <h2 className="font-semibold text-gray-800 mb-1">予約情報を入力</h2>
            <p className="text-sm text-indigo-600 mb-6">
              {selectedDate && format(selectedDate, 'M月d日(E)', { locale: ja })}
              {' '}{format(new Date(selectedSlot.time), 'HH:mm')}〜
              （担当: {selectedSlot.staffName}）
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">お名前 *</label>
                  <input type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
                  <input type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号（任意）</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考（任意）</label>
                <textarea value={form.note} rows={3}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="ご質問・状況などお気軽にご記入ください"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>
              )}
              <button type="submit" disabled={submitting}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
                {submitting ? '予約中...' : '予約を確定する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function SlotButton({ slot, selected, onClick }: {
  slot: TimeSlot; selected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition text-center ${
        selected
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'border-gray-200 text-gray-700 hover:border-indigo-400 hover:text-indigo-600'
      }`}
    >
      {format(new Date(slot.time), 'HH:mm')}
    </button>
  )
}
