interface SlackBookingNotification {
  candidateName: string
  candidateEmail: string
  candidatePhone?: string | null
  staffName: string
  pageTitle: string
  startTimeJst: string
  meetLink?: string | null
}

export async function notifySlackNewBooking(data: SlackBookingNotification) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const lines = [
    `*新しい面談予約が入りました*`,
    `予約ページ: ${data.pageTitle}`,
    `担当: ${data.staffName}`,
    `求職者: ${data.candidateName}`,
    `日時: ${data.startTimeJst}`,
    `Email: ${data.candidateEmail}`,
  ]
  if (data.candidatePhone) lines.push(`電話: ${data.candidatePhone}`)
  if (data.meetLink) lines.push(`Google Meet: ${data.meetLink}`)

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    })
  } catch (e) {
    console.error('Slack notification error (non-fatal):', e)
  }
}
