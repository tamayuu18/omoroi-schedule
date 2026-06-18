'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface BookingPage {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  max_days_ahead: number
  available_days: number[]
}

interface TimeSlot {
  time: string
  staffId: string
  staffName: string
}

export default function BookPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [page, setPage] = useState<BookingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'calendar' | 'slots' | 'form'>('calendar')

  useEffect(() => {
    fetch(`/api/booking-pages?slug=${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        setPage(d.page)
        setLoading(false)
      })
  }, [params.slug])

  async function handleDayClick(day: Date) {
    setSelectedDate(day)
    setSelectedSlot(null)
    setSlotsLoading(true)
    setStep('slots')
    const dateStr = format(day, 'yyyy-MM-dd')
    const res = await fetch(`/api/availability?pageId=${page!.id}&date=${dateStr}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setSlotsLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page!.id,
          slotTime: selectedSlot!.time,
          staffId: selectedSlot!.staffId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          note: form.note,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const searchParams = new URLSearchParams({
          name: form.name,
          time: selectedSlot!.time,
          meet: data.booking?.google_meet_link ?? '',
        })
        router.push(`/book/${params.slug}/confirmed?${searchParams.toString()}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">予約ページが見つかりません</p>
      </div>
    )
  }

  const today = startOfDay(new Date())
  const maxDate = addDays(today, page.max_days_ahead)
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startDow = startOfMonth(currentMonth).getDay()

  const amSlots = slots.filter((s) => new Date(s.time).getHours() < 12)
  const pmSlots = slots.filter((s) => new Date(s.time).getHours() >= 12)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
          {page.description && <p className="text-gray-500 mt-2">{page.description}</p>}
          <p className="text-sm text-indigo-600 mt-2">{page.duration_minutes}分の面接</p>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ←
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'yyyy年M月', { locale: ja })}
            </h2>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDow }).map((_, i) => <div key={i} />)}
            {days.map((day) => {
              const isDisabled = isBefore(day, today) || isBefore(maxDate, day) || !page.available_days.includes(day.getDay())
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isDisabled && handleDayClick(day)}
                  disabled={isDisabled}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                    ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-indigo-50 cursor-pointer'}
                    ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-600' : ''}
                    ${!isSelected && !isDisabled ? 'text-gray-700' : ''}
                  `}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Slots */}
        {step !== 'calendar' && selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {format(selectedDate, 'M月d日(E)', { locale: ja })}の空き時間
            </h2>
            {slotsLoading ? (
              <p className="text-gray-500 text-sm">読み込み中...</p>
            ) : slots.length === 0 ? (
              <p className="text-gray-500 text-sm">この日は空き時間がありません</p>
            ) : (
              <div className="space-y-4">
                {amSlots.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">午前</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {amSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => { setSelectedSlot(slot); setStep('form') }}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                            selectedSlot?.time === slot.time
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {format(new Date(slot.time), 'HH:mm')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {pmSlots.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">午後</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {pmSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => { setSelectedSlot(slot); setStep('form') }}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                            selectedSlot?.time === slot.time
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {format(new Date(slot.time), 'HH:mm')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Booking Form */}
        {step === 'form' && selectedSlot && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">予約情報を入力</h2>
            <p className="text-sm text-indigo-600 mb-4">
              {selectedDate && format(selectedDate, 'M月d日(E)', { locale: ja })} {format(new Date(selectedSlot.time), 'HH:mm')} 〜 (担当: {selectedSlot.staffName})
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">お名前 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? '予約中...' : '予約を確定する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
