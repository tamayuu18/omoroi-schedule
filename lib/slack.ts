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

  const fields = [
    { title: '📋 予約ページ', value: data.pageTitle, short: true },
    { title: '👨‍💼 担当', value: data.staffName, short: true },
    { title: '📅 日時', value: data.startTimeJst, short: true },
    { title: '👤 求職者', value: data.candidateName, short: true },
    { title: '📧 メール', value: data.candidateEmail, short: false },
  ]
  if (data.candidatePhone) {
    fields.push({ title: '📞 電話', value: data.candidatePhone, short: true })
  }
  if (data.meetLink) {
    fields.push({ title: '🔗 Google Meet', value: `<${data.meetLink}|参加リンク>`, short: true })
  }

  const payload = {
    attachments: [
      {
        color: '#6366f1',
        pretext: '🎉 *新しい面談予約が入りました！*',
        mrkdwn_in: ['pretext', 'fields'],
        fields,
        footer: 'omoroi schedule',
        ts: Math.floor(Date.now() / 1000).toString(),
      },
    ],
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('Slack notification error (non-fatal):', e)
  }
}
