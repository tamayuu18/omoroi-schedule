// スタッフ名（姓）→ Slack メンバーID
const SLACK_MEMBER_IDS: Record<string, string> = {
  '岩田': 'U0B9BM1QY4T',
  '新': 'U0B9W7EKCH5',
  '笠原': 'U0B9QDPLWP8',
  '濱野': 'U0B9UGLJDDL',
  '岸田': 'U0BBSFAR6SK',
  '岸': 'U0B9L2CQ00K',
  '小宮': 'U0BBH6NRLES',
  '長谷川': 'U0BAC9KCCCQ',
  '中野': 'U0B9RGWN7RS',
  '大田': 'U0B9YF6BKQR',
}

// 「岸田」が「岸」に誤マッチしないよう、長い姓から順に照合する
function getSlackMention(staffName: string): string | null {
  const matched = Object.keys(SLACK_MEMBER_IDS)
    .sort((a, b) => b.length - a.length)
    .find((lastName) => staffName.includes(lastName))
  return matched ? `<@${SLACK_MEMBER_IDS[matched]}>` : null
}

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

  const mention = getSlackMention(data.staffName)
  const payload = {
    attachments: [
      {
        color: '#6366f1',
        pretext: `${mention ? `${mention} ` : ''}🎉 *新しい面談予約が入りました！*`,
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

  const mention = getSlackMention(data.staffName)
  const payload = {
    attachments: [
      {
        color: '#ef4444',
        pretext: `${mention ? `${mention} ` : ''}❌ *面談予約がキャンセルされました*`,
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
