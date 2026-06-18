import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-4xl font-bold text-indigo-600 mb-4">omoroi schedule</h1>
        <p className="text-xl text-gray-600 mb-8">スケジュール管理・面接予約システム</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            管理画面へ
          </Link>
        </div>
      </div>
    </div>
  )
}
