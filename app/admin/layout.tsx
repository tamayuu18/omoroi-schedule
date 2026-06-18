import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            omoroi schedule
          </Link>
          <p className="text-xs text-gray-500 mt-1">管理画面</p>
        </div>
        <nav className="p-4 flex flex-col gap-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            <span>📊</span>
            <span>ダッシュボード</span>
          </Link>
          <Link href="/admin/bookings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            <span>📅</span>
            <span>予約一覧</span>
          </Link>
          <Link href="/admin/staff" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            <span>👥</span>
            <span>スタッフ管理</span>
          </Link>
          <Link href="/admin/pages" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
            <span>⚙️</span>
            <span>予約ページ設定</span>
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
