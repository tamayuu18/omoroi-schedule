'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
  email: string
  google_refresh_token: string | null
  is_active: boolean
  created_at: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadStaff() {
    const res = await fetch('/api/staff')
    const data = await res.json()
    setStaff(data.staff ?? [])
    setLoading(false)
  }

  useEffect(() => { loadStaff() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    setName('')
    setEmail('')
    await loadStaff()
    setSubmitting(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">スタッフ管理</h1>

      {/* Add Staff Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">スタッフを追加</h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            placeholder="氏名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            追加
          </button>
        </form>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">スタッフ一覧</h2>
        </div>
        <div className="divide-y">
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">読み込み中...</p>
          ) : staff.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">スタッフが登録されていません</p>
          ) : (
            staff.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  {s.google_refresh_token ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Google Calendar 連携済み
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      未連携
                    </span>
                  )}
                  <a
                    href={`/api/google/auth?staffId=${s.id}`}
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Google Calendar連携
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
