import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-5 border-b">
          <Link href="/" className="text-base font-semibold text-indigo-600">
            omoroi schedule
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">管理画面</p>
        </div>
        <nav className="p-3 flex flex-col gap-0.5">
          <Link href="/admin" className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            ダッシュボード
          </Link>
          <Link href="/admin/bookings" className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            予約一覧
          </Link>
          <Link href="/admin/staff" className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            スタッフ管理
          </Link>
          <Link href="/admin/pages" className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
            予約ページ設定
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
