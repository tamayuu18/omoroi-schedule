'use client'

import { useEffect, useState } from 'react'

interface Staff { id: string; name: string }
interface BookingPage {
  id: string; slug: string; title: string; description: string | null
  duration_minutes: number; is_active: boolean
}

export default function BookingPagesPage() {
  const [pages, setPages] = useState<BookingPage[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '', slug: '', description: '', duration_minutes: 30,
    available_start_hour: 9, available_end_hour: 18,
  })

  async function load() {
    const [pagesRes, staffRes] = await Promise.all([
      fetch('/api/booking-pages'),
      fetch('/api/staff'),
    ])
    const pagesData = await pagesRes.json()
    const staffData = await staffRes.json()
    setPages(pagesData.pages || [])
    setStaffList(staffData.staff || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createPage(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/booking-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, staffIds: selectedStaff }),
    })
    setShowForm(false)
    setForm({ title: '', slug: '', description: '', duration_minutes: 30, available_start_hour: 9, available_end_hour: 18 })
    setSelectedStaff([])
    load()
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">予約ページ設定</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + 新しい予約ページ
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold mb-4">予約ページを作成</h2>
          <form onSubmit={createPage} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input type="text" required value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ（URL）</label>
                <input type="text" required value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="interview-30min"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
              <textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面談時間（分）</label>
                <input type="number" value={form.duration_minutes} min={15} max={120} step={15}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">受付開始時間</label>
                <select value={form.available_start_hour}
                  onChange={(e) => setForm({ ...form, available_start_hour: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">受付終了時間</label>
                <select value={form.available_end_hour}
                  onChange={(e) => setForm({ ...form, available_end_hour: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {Array.from({ length: 13 }, (_, i) => i + 12).map((h) => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">担当スタッフ（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {staffList.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setSelectedStaff((prev) =>
                      prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                    )}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      selectedStaff.includes(s.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                作成
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">読み込み中...</p>
        ) : !pages.length ? (
          <p className="text-gray-400 text-sm text-center py-8">予約ページがありません</p>
        ) : pages.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                <p className="text-sm text-gray-400 mt-2">面談時間: {p.duration_minutes}分</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">公開URL</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {appUrl}/book/{p.slug}
                </code>
                <div className="mt-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(`${appUrl}/book/${p.slug}`)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    URLをコピー
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
