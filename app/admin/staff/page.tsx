'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
  email: string
  google_refresh_token: string | null
  google_channel_id: string | null
  google_channel_expiry: string | null
  is_active: boolean
  created_at: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [watchingId, setWatchingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  async function handleWatch(staffId: string) {
    setWatchingId(staffId)
    const res = await fetch('/api/google/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId }),
    })
    const data = await res.json()
    if (data.error) alert('Watch設定エラー: ' + data.error)
    else {
      alert('カレンダー監視を開始しました')
      await loadStaff()
    }
    setWatchingId(null)
  }

  async function handleDelete(id: string, staffName: string) {
    if (!confirm(`${staffName} を削除しますか？\n（予約ページからも外れます）`)) return
    setDeletingId(id)
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) alert('削除エラー: ' + data.error)
    else await loadStaff()
    setDeletingId(null)
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">スタッフ管理</h1>

      <div className="bg-white rounded-xl border p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">スタッフを追加</h2>
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

      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold text-gray-900">スタッフ一覧</h2>
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
                  <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                  <button
                    onClick={() => copyId(s.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 font-mono"
                  >
                    ID: {s.id.slice(0, 8)}... {copiedId === s.id ? '(コピー済み)' : '(クリックでコピー)'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {s.google_refresh_token ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Google Calendar 連携済み
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      未連携
                    </span>
                  )}
                  {s.google_refresh_token && (
                    <button
                      onClick={() => handleWatch(s.id)}
                      disabled={watchingId === s.id}
                      title={s.google_channel_expiry ? `監視中（有効期限: ${new Date(s.google_channel_expiry).toLocaleDateString('ja-JP')}）` : 'カレンダー削除を検知して自動キャンセル'}
                      className={`text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${s.google_channel_id ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50'}`}
                    >
                      {watchingId === s.id ? '設定中...' : s.google_channel_id ? '監視更新' : 'カレンダー監視設定'}
                    </button>
                  )}
                  <a
                    href={`/api/google/auth?staffId=${s.id}`}
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Google Calendar連携
                  </a>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deletingId === s.id}
                    className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === s.id ? '削除中...' : '削除'}
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
