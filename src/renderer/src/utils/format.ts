export function formatCurrency(amount: number, symbol: string = '$'): string {
  return symbol + amount.toFixed(2)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  return formatDate(dateStr) + ' ' + formatTime(dateStr)
}

export function getTimeElapsed(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const orderTime = new Date(dateStr)
  const diffMs = now.getTime() - orderTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return diffMins + ' min ago'

  const diffHours = Math.floor(diffMins / 60)
  const remainingMins = diffMins % 60
  if (diffHours < 24) {
    return diffHours + 'h ' + remainingMins + 'm ago'
  }

  return Math.floor(diffHours / 24) + 'd ago'
}

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export function getDateNDaysAgo(n: number): string {
  const date = new Date()
  date.setDate(date.getDate() - n)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}
