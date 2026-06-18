import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
      <div className="text-center max-w-lg px-6">
        <h1 className="text-4xl font-bold text-indigo-700 mb-3">おもろい日程調整</h1>
        <p className="text-gray-600 mb-8 text-lg">
          複数担当者の空き時間を自動集約。求職者がかんたんに面談を予約できます。
        </p>
        <Link
          href="/admin"
          className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          管理画面へ
        </Link>
      </div>
    </div>
  )
}
