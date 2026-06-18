'use client'

import { useEffect, useState } from 'react'

interface Staff {
  id: string
  name: string
  email: string
  google_refresh_token: string | null
  is_active: boolean
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    const res = await fetch('/api/staff')
    const data = await res.json()
    setStaff(data.staff || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addStaff(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    setName('')
    setEmail('')
    setAdding(false)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">スタッフ管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold mb-4">スタッフを追加</h2>
        <form onSubmit={addStaff} className="flex gap-3">
          <input
            type="text"
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
          />
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            追加
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-sm px-6 py-8 text-center">読み込み中...</p>
        ) : !staff.length ? (
          <p className="text-gray-400 text-sm px-6 py-8 text-center">スタッフがいません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">名前</th>
                <th className="px-6 py-3 text-left font-medium">メール</th>
                <th className="px-6 py-3 text-left font-medium">Google Calendar</th>
                <th className="px-6 py-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{s.name}</td>
                  <td className="px-6 py-4">{s.email}</td>
                  <td className="px-6 py-4">
                    {s.google_refresh_token ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        連携済み
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                        未連携
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/api/google/auth?staffId=${s.id}`}
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      {s.google_refresh_token ? 'Google Calendar 再連携' : 'Google Calendar 連携'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
