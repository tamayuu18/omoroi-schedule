'use client'

import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'

export default function ConfirmedClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') ?? ''
  const timeStr = searchParams.get('time') ?? ''
  const meetLink = searchParams.get('meet') ?? ''

  const time = timeStr ? new Date(timeStr) : null

  function buildGoogleCalendarUrl() {
    if (!time) return '#'
    const start = time.toISOString().replace(/-|:|\.\d\d\d/g, '')
    const end = new Date(time.getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '')
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=面接予約&dates=${start}/${end}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">予約が完了しました</h1>
          <p className="text-gray-500 mb-6">確認メールをご確認ください</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
            {name && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">お名前</span>
                <span className="font-medium text-gray-900">{name}</span>
              </div>
            )}
            {time && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">日時</span>
                <span className="font-medium text-gray-900">
                  {format(time, 'M月d日(E) HH:mm', { locale: ja })}
                </span>
              </div>
            )}
            {meetLink && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Google Meet</span>
                <a href={meetLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  参加リンク
                </a>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <a
              href={buildGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Google Calendarに追加
            </a>
            <Link
              href={`/book/${slug}`}
              className="block w-full border py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              予約ページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
