import Link from 'next/link'

const navItems = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/bookings', label: '予約一覧' },
  { href: '/admin/staff', label: 'スタッフ管理' },
  { href: '/admin/pages', label: '予約ページ設定' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-indigo-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-indigo-800">
          <p className="text-xs text-indigo-300 uppercase tracking-wider">管理画面</p>
          <h2 className="font-bold text-lg mt-1">おもろい日程調整</h2>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-6 py-3 text-sm hover:bg-indigo-800 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
