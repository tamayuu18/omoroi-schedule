'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
}

interface BookingPage {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  buffer_minutes: number
  available_start_hour: number
  available_end_hour: number
  is_active: boolean
  staff?: Staff[]
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  description: '',
  duration_minutes: 30,
  buffer_minutes: 15,
  available_start_hour: 9,
  available_end_hour: 18,
  staffIds: [] as string[],
}

export default function PagesPage() {
  const [pages, setPages] = useState<BookingPage[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [copied, setCopied] = useState<string | null>(null)

  async function loadData() {
    const [pagesRes, staffRes] = await Promise.all([
      fetch('/api/booking-pages'),
      fetch('/api/staff'),
    ])
    const pagesData = await pagesRes.json()
    const staffData = await staffRes.json()
    setPages(pagesData.pages ?? [])
    setAllStaff(staffData.staff ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      await fetch(`/api/booking-pages/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/booking-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    await loadData()
  }

  function startEdit(page: BookingPage) {
    setForm({
      title: page.title,
      slug: page.slug,
      description: page.description ?? '',
      duration_minutes: page.duration_minutes,
      buffer_minutes: page.buffer_minutes ?? 15,
      available_start_hour: page.available_start_hour ?? 9,
      available_end_hour: page.available_end_hour ?? 18,
      staffIds: page.staff?.map((s) => s.id) ?? [],
    })
    setEditingId(page.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('この予約ページを削除しますか？')) return
    await fetch(`/api/booking-pages/${id}`, { method: 'DELETE' })
    await loadData()
  }

  function copyUrl(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">予約ページ設定</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            新規作成
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">{editingId ? '予約ページを編集' : '新しい予約ページを作成'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="初回面接"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  pattern="[a-z0-9-]+"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="first-interview"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="面接の詳細説明"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">面接時間 (分)</label>
              <select
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={15}>15分</option>
                <option value={30}>30分</option>
                <option value={45}>45分</option>
                <option value={60}>60分</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">バッファ時間（分）</label>
              <select
                value={form.buffer_minutes}
                onChange={(e) => setForm({ ...form, buffer_minutes: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0}>0分</option>
                <option value={5}>5分</option>
                <option value={10}>10分</option>
                <option value={15}>15分</option>
                <option value={30}>30分</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">受付開始時間</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.available_start_hour}
                  onChange={(e) => setForm({ ...form, available_start_hour: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">受付終了時間</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.available_end_hour}
                  onChange={(e) => setForm({ ...form, available_end_hour: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">担当スタッフ</label>
              <div className="space-y-2">
                {allStaff.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.staffIds.includes(s.id)}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          staffIds: e.target.checked
                            ? [...form.staffIds, s.id]
                            : form.staffIds.filter((id) => id !== s.id),
                        })
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700">
                {editingId ? '保存する' : '作成する'}
              </button>
              <button type="button" onClick={cancelForm} className="border px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <div className="divide-y">
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">読み込み中...</p>
          ) : pages.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">予約ページがありません</p>
          ) : (
            pages.map((page) => (
              <div key={page.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{page.title}</p>
                  <p className="text-sm text-gray-500">/book/{page.slug} · {page.duration_minutes}分</p>
                  {page.staff && page.staff.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      担当: {page.staff.map((s) => s.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/book/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm border px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    プレビュー
                  </a>
                  <button
                    onClick={() => copyUrl(page.slug)}
                    className="text-sm border px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    {copied === page.slug ? 'コピー済み' : 'URLをコピー'}
                  </button>
                  <button
                    onClick={() => startEdit(page)}
                    className="text-sm border px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="text-sm border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
