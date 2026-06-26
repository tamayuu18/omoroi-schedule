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

interface SlackWarningNotification {
  title: string
  detail: string
}

/**
 * カレンダー登録失敗・空き確認失敗など、サイレントに握り潰されがちな異常を
 * Slack に ⚠️ 警告として通知する。トークン失効などに即気づけるようにするのが目的。
 */
export async function notifySlackWarning(data: SlackWarningNotification) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const payload = {
    attachments: [
      {
        color: '#f59e0b',
        pretext: `⚠️ *${data.title}*`,
        mrkdwn_in: ['pretext', 'text'],
        text: data.detail,
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
    console.error('Slack warning error (non-fatal):', e)
  }
}

interface SlackCancelNotification {
  candidateName: string
  candidateEmail: string
  staffName: string
  pageTitle: string
  startTimeJst: string
  cancelledBy?: string
}

export async function notifySlackCancelBooking(data: SlackCancelNotification) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const fields = [
    { title: '📋 予約ページ', value: data.pageTitle, short: true },
    { title: '👨‍💼 担当', value: data.staffName, short: true },
    { title: '📅 日時', value: data.startTimeJst, short: true },
    { title: '👤 求職者', value: data.candidateName, short: true },
    { title: '📧 メール', value: data.candidateEmail, short: false },
  ]
  if (data.cancelledBy) {
    fields.push({ title: '🛑 キャンセル元', value: data.cancelledBy, short: true })
  }

  const payload = {
    attachments: [
      {
        color: '#ef4444',
        pretext: '❌ *面談予約がキャンセルされました*',
        mrkdwn_in: ['pretext'],
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
    console.error('Slack cancel notification error (non-fatal):', e)
  }
}
